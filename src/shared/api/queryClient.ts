import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/errors';

/**
 * One QueryClient for the app — owns retry/backoff and stale-time defaults, and is where global
 * error handling (e.g. redirect-to-login on 401) will hook in once auth flows exist. See
 * docs/architecture.md §4.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          (error.kind === 'unauthorized' || error.kind === 'validation')
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
