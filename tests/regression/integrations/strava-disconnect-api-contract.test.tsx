/**
 * Issue #58 — "let the person disconnect a source through the existing disconnect endpoint" (issue
 * body). Real endpoint: `POST /integrations/strava/disconnect/` (`apps/integrations/urls.py:11`,
 * view `apps/integrations/views.py:99-109`, service `apps/integrations/services.py:58`
 * `disconnect_strava`). The view takes no request body and returns a bare
 * `{success: true, message: "Strava disconnected"}` on success (`views.py:109`). Mirrors the
 * exchange contract test's shape (`strava-exchange-mock.test.ts`) but for the API-client layer:
 * asserts the client posts to the right path with no body and that the mutation invalidates the
 * shared sources query (`sourcesKeys.all`, same cache key `useSourcesQuery` reads,
 * `src/features/home/api/sourcesApi.ts`) so Profile and Manage-sources both pick up the change.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { sourcesKeys } from '@/features/home';
import {
  disconnectStrava,
  useDisconnectStravaMutation,
} from '@/features/integrations/api/stravaApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

function wrapper(queryClient: QueryClient) {
  function QueryClientTestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return QueryClientTestWrapper;
}

describe('disconnectStrava (issue #58, POST /integrations/strava/disconnect/)', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('posts to /integrations/strava/disconnect/ with no request body', async () => {
    mockPost.mockResolvedValue({ success: true, message: 'Strava disconnected' });

    const result = await disconnectStrava();

    expect(mockPost).toHaveBeenCalledWith('/integrations/strava/disconnect/');
    expect(result).toEqual({ success: true, message: 'Strava disconnected' });
  });

  it('rejects a malformed response instead of silently accepting it', async () => {
    mockPost.mockResolvedValue({ success: true });

    await expect(disconnectStrava()).rejects.toThrow();
  });
});

describe('useDisconnectStravaMutation (issue #58)', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('invalidates the shared sources query on success so Profile and Manage-sources refetch', async () => {
    mockPost.mockResolvedValue({ success: true, message: 'Strava disconnected' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDisconnectStravaMutation(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sourcesKeys.all }));
    queryClient.clear();
  });
});
