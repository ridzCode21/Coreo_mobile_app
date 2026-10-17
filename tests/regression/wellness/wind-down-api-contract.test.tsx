/**
 * Issue #42 — `useWindDownQuery` contract against `GET /users/me/wind-down/`
 * (`apps/users/urls.py:36`). Pattern mirrors `training-week-api-contract.test.tsx`: `apiClient`
 * mocked directly so this protects the hook's own request/response wiring, independent of the
 * mock-router test (`wind-down-mock.test.ts`).
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useWindDownQuery } from '@/features/wellness/api/windDownApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({ apiClient: { get: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

const FULL_RESPONSE = {
  wind_down: {
    clock: '9:12 PM',
    headline: 'Your day ran hot. Tonight we land it early.',
    title: "Tonight's wind-down",
    lights_out: '10:45',
    steps: [
      { time: '9:45', text: 'phone goes to the kitchen', reason: 'the 1 AM fix' },
      { time: '10:00', text: 'chai on the balcony, no screens', reason: 'yours already' },
      { time: '10:30', text: 'six slow breaths in bed', reason: '2 min, guided' },
    ],
    line: 'One routine, built from your interview. No library to scroll.',
    reason: 'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
    pushed: false,
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('windDown: useWindDownQuery contract (GET /users/me/wind-down/, #42)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/wind-down/', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useWindDownQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/wind-down/');
  });

  it('returns the parsed payload unchanged (bare payload, no envelope unwrap)', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useWindDownQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(FULL_RESPONSE);
  });

  it('parses the incomplete-interview { wind_down: null } response', async () => {
    mockGet.mockResolvedValue({ wind_down: null });

    const { result } = renderHook(() => useWindDownQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ wind_down: null });
  });
});
