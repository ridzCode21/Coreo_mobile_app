/**
 * Issue #50 — `useInsightsQuery` contract against `GET /insights/` (`apps/insights/views.py:92-122`
 * mounted at `med_app/urls.py:45`). Pattern mirrors `wellness/right-now-api-contract.test.tsx`:
 * this endpoint also returns a bare (unwrapped) payload — `apps/insights/views.py` never uses the
 * `{success, data}` envelope (`shared/api/mock/envelope.ts:23-27` calls insights "Style B").
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { insightsKeys, useInsightsQuery } from '@/features/patterns/api/insightsApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({ apiClient: { get: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('patterns: useInsightsQuery contract (GET /insights/, #50)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /insights/', async () => {
    mockGet.mockResolvedValue({ status: 'not_enough_data', days_logged: 15, days_remaining: 15 });

    const { result } = renderHook(() => useInsightsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/insights/');
  });

  it('uses the insightsKeys.all query key', () => {
    expect(insightsKeys.all).toEqual(['insights']);
  });

  it('returns the parsed payload unchanged (bare payload, no envelope unwrap)', async () => {
    const response = { status: 'no_insights', message: 'Keep logging...' };
    mockGet.mockResolvedValue(response);

    const { result } = renderHook(() => useInsightsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it('parses the ready shape with insights through to the hook result', async () => {
    const card = {
      id: 1,
      col_x: 'sleep_hours',
      col_y: 'steps',
      r_value: -0.3,
      lag_days: 1,
      insight_text: 'Less sleep seems linked to fewer steps the next day.',
      autocorrelation_warning: false,
      created_at: '2026-06-01T00:00:00Z',
      disclaimer:
        'Health patterns only. Not medical advice. Consult a healthcare provider for medical decisions.',
    };
    mockGet.mockResolvedValue({ status: 'ready', insights: [card] });

    const { result } = renderHook(() => useInsightsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: 'ready', insights: [card] });
  });

  it('surfaces isError when the request rejects', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useInsightsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('surfaces isError when the response fails strict schema parsing', async () => {
    mockGet.mockResolvedValue({ status: 'ready', insights: [{ id: 1 }] });

    const { result } = renderHook(() => useInsightsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
