/**
 * Issue #56 — orchestrates the whole "Connect with Strava" flow: open the authorize URL in the
 * browser (`Linking.openURL`, no native module — issue body), catch the `coreo://strava-connect`
 * redirect, and send the code to the real exchange endpoint
 * (`apps/integrations/views.py:53-77`). `state` round-tripping is a security property
 * (app-security-review): a redirect whose `state` does not match what this run generated must be
 * rejected, not treated as a successful connection. `EXPO_PUBLIC_STRAVA_CLIENT_ID` has no real value
 * yet (plan.md Decision log — no paid Strava account exists to register a client), so the
 * not-configured branch mirrors the existing `getGoogleIdentityToken` precedent
 * (`features/auth/lib/googleIdentity.ts`) for a missing external key.
 */
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';

import { useStravaConnect } from '@/features/integrations/lib/useStravaConnect';
import { STRAVA_REDIRECT_PATH } from '@/features/integrations/lib/strava/redirect';
import { apiClient } from '@/shared/api/client';

jest.mock('expo-linking', () => ({
  openURL: jest.fn(async () => true),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(async () => null),
  createURL: jest.fn((path: string) => `coreo://${path}`),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));

jest.mock('@/shared/api/client', () => ({ apiClient: { post: jest.fn() } }));

let mockExtra: Record<string, unknown> = { stravaClientId: 'test-client-id' };
const mockOpenURL = Linking.openURL as jest.Mock;
const mockAddEventListener = Linking.addEventListener as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function emitRedirect(url: string) {
  const [, handler] = mockAddEventListener.mock.calls[mockAddEventListener.mock.calls.length - 1];
  act(() => handler({ url }));
}

describe('useStravaConnect (issue #56)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtra = { stravaClientId: 'test-client-id' };
  });

  it('opens the Strava authorize URL for the configured client and registers a redirect listener', async () => {
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const openedUrl = new URL(mockOpenURL.mock.calls[0][0]);
    expect(openedUrl.hostname).toBe('www.strava.com');
    expect(openedUrl.searchParams.get('client_id')).toBe('test-client-id');
    expect(mockAddEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });

  it('is an error, not configured, when there is no Strava client id (no paid account to register one yet)', async () => {
    mockExtra = {};
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Strava is not configured');
  });

  it('fails closed without opening Strava when secure random generation fails', async () => {
    const getRandomValues = jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(() => {
        throw new Error('Web Crypto is unavailable');
      });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Could not connect to Strava. Try again.');
    getRandomValues.mockRestore();
  });

  it('exchanges the code from a matching redirect and reports success', async () => {
    mockPost.mockResolvedValue({ success: true, athlete_id: 999, activities_imported: 4 });
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });
    const openedUrl = new URL(mockOpenURL.mock.calls[0][0]);
    const state = openedUrl.searchParams.get('state');

    await act(async () => {
      emitRedirect(`coreo://${STRAVA_REDIRECT_PATH}?code=abc123&state=${state}`);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(mockPost).toHaveBeenCalledWith(
      '/integrations/strava/exchange/',
      expect.objectContaining({ code: 'abc123' }),
    );
  });

  it('rejects a redirect whose state does not match (possible forged/stray redirect)', async () => {
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      emitRedirect(`coreo://${STRAVA_REDIRECT_PATH}?code=abc123&state=not-the-real-state`);
      await Promise.resolve();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
  });

  it('treats a declined consent (error=access_denied) as a cancel, not a crash', async () => {
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });
    const state = new URL(mockOpenURL.mock.calls[0][0]).searchParams.get('state');

    await act(async () => {
      emitRedirect(`coreo://${STRAVA_REDIRECT_PATH}?error=access_denied&state=${state}`);
      await Promise.resolve();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Connection cancelled.');
  });

  it('maps a backend STRAVA_AUTH_FAILED response to the backend message', async () => {
    const { ApiError } = jest.requireActual('@/shared/api/errors');
    mockPost.mockRejectedValue(
      ApiError.fromResponse(400, {
        success: false,
        error: {
          code: 'STRAVA_AUTH_FAILED',
          message: 'Strava authorization failed. Please try connecting again.',
        },
      }),
    );
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });
    const state = new URL(mockOpenURL.mock.calls[0][0]).searchParams.get('state');

    await act(async () => {
      emitRedirect(`coreo://${STRAVA_REDIRECT_PATH}?code=abc123&state=${state}`);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe(
      'Strava authorization failed. Please try connecting again.',
    );
  });

  it('ignores a redirect for a different deep link entirely', async () => {
    const { result } = renderHook(() => useStravaConnect(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      emitRedirect('coreo://profile/manage-sources');
      await Promise.resolve();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(result.current.status).not.toBe('error');
  });
});
