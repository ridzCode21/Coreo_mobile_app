/**
 * Issue #48 round 2 — `GET /integrations/sources/` (`apps/integrations/views.py:30-37`) now always
 * appends a `whoop` and `oura` record to `sources` (`apps/integrations/source_status.py:30-31`
 * iterates `WEARABLE_ORDER` unconditionally) and adds a `status` field
 * (`apps/integrations/readings.py:96-104`, `source_status.py:51-70`) plus a new top-level
 * `last_night` key (`apps/integrations/readings.py:26-36`). The previous Zod schema only allowed the
 * 3 known `DEVICE_SOURCES` values and no `last_night` key, so it would throw a `ZodError` on this
 * real, documented response shape — breaking `useSourcesQuery` for every screen that calls it. This
 * protects the fix: `source` validates as a string at the wire boundary, `useSourcesQuery` filters
 * back down to the 3 known device sources (so `ReadingYouCard`'s exhaustive
 * `Record<SourceStatus['source'], ...>`, `ManageSourcesScreen`, and `profileCopy.sourceLabels` never
 * see an unknown source), and `useLastNightQuery` exposes the new key without a second network call.
 */

import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSourcesQuery, useLastNightQuery } from '@/features/home/api/sourcesApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

const REAL_BACKEND_SHAPED_RESPONSE = {
  success: true,
  sources: [
    {
      source: 'apple_health',
      connected: true,
      last_synced_at: '2026-10-21T06:00:00Z',
      synced_through: '2026-10-21',
      status: 'live',
    },
    {
      source: 'health_connect',
      connected: false,
      last_synced_at: null,
      synced_through: null,
      status: null,
    },
    {
      source: 'strava',
      connected: true,
      last_synced_at: null,
      synced_through: null,
      status: null,
    },
    {
      source: 'whoop',
      connected: true,
      last_synced_at: '2026-10-20T23:40:00Z',
      synced_through: '2026-10-20',
      status: 'quiet',
    },
    {
      source: 'oura',
      connected: false,
      last_synced_at: null,
      synced_through: null,
      status: null,
    },
  ],
  last_night: {
    date: '2026-10-21',
    sleep: { hours: 6.5, source: 'apple_health', estimate: true },
    recovery: null,
  },
};

function wrapperWithClient(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('sourcesApi contract: real backend shape with whoop/oura + status + last_night (#48)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useSourcesQuery parses the 5-record response without throwing and filters to the 3 known device sources', async () => {
    mockGet.mockResolvedValue(REAL_BACKEND_SHAPED_RESPONSE);

    const { result } = renderHook(() => useSourcesQuery(), {
      wrapper: wrapperWithClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((s) => s.source)).toEqual([
      'apple_health',
      'health_connect',
      'strava',
    ]);
    expect(result.current.data?.find((s) => s.source === 'apple_health')?.status).toBe('live');
  });

  it('useLastNightQuery returns the new last_night key', async () => {
    mockGet.mockResolvedValue(REAL_BACKEND_SHAPED_RESPONSE);

    const { result } = renderHook(() => useLastNightQuery(), {
      wrapper: wrapperWithClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      date: '2026-10-21',
      sleep: { hours: 6.5, source: 'apple_health', estimate: true },
      recovery: null,
    });
  });

  it('shares one GET call between useSourcesQuery and useLastNightQuery on the same QueryClient', async () => {
    mockGet.mockResolvedValue(REAL_BACKEND_SHAPED_RESPONSE);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const sources = renderHook(() => useSourcesQuery(), { wrapper: wrapperWithClient(client) });
    const lastNight = renderHook(() => useLastNightQuery(), { wrapper: wrapperWithClient(client) });

    await waitFor(() => expect(sources.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(lastNight.result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/integrations/sources/');
  });

  it('a recovery value is passed through untouched when present', async () => {
    mockGet.mockResolvedValue({
      ...REAL_BACKEND_SHAPED_RESPONSE,
      last_night: {
        ...REAL_BACKEND_SHAPED_RESPONSE.last_night,
        recovery: { score: 82, source: 'whoop' },
      },
    });

    const { result } = renderHook(() => useLastNightQuery(), {
      wrapper: wrapperWithClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recovery).toEqual({ score: 82, source: 'whoop' });
  });
});
