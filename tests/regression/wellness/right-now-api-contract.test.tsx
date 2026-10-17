/**
 * Issue #42 — `useRightNowQuery` contract against `GET /users/me/right-now/`
 * (`apps/users/urls.py:37`). Pattern mirrors `wind-down-api-contract.test.tsx`.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useRightNowQuery } from '@/features/wellness/api/rightNowApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({ apiClient: { get: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

const FULL_RESPONSE = {
  breath: {
    eyebrow: 'Right now',
    headline: "Your heart's been running for twenty minutes. Let's slow it together.",
    cue: 'Breathe out',
    pattern: 'In for 4 · hold for 7 · out for 8',
    line: 'Nothing to pick. Just this, six times.',
    not_now: 'Not now',
    im_here: "I'm here",
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('rightNow: useRightNowQuery contract (GET /users/me/right-now/, #42)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/right-now/', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useRightNowQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/right-now/');
  });

  it('returns the parsed payload unchanged (bare payload, no envelope unwrap)', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useRightNowQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(FULL_RESPONSE);
  });

  it('parses { breath: null, message: "Nothing to do." }', async () => {
    mockGet.mockResolvedValue({ breath: null, message: 'Nothing to do.' });

    const { result } = renderHook(() => useRightNowQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ breath: null, message: 'Nothing to do.' });
  });

  it('does not fetch when enabled is false', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    renderHook(() => useRightNowQuery(false), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockGet).not.toHaveBeenCalled();
  });
});
