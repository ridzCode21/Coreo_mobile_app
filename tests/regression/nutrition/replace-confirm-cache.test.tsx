import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useReplaceConfirmMutation } from '@/features/nutrition/api/mealPlanApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

describe('nutrition: replacement confirmation cache ordering (issue #35)', () => {
  it('does not finish confirmation until the replacement plan invalidation finishes', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    let finishPlanInvalidation: (() => void) | undefined;
    const planInvalidation = new Promise<void>((resolve) => {
      finishPlanInvalidation = resolve;
    });
    jest
      .spyOn(client, 'invalidateQueries')
      .mockImplementationOnce(() => planInvalidation)
      .mockResolvedValueOnce();
    mockPost.mockResolvedValue({ status: 'ok', meal_id: 999 });

    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useReplaceConfirmMutation('2026-10-14'), { wrapper });
    let settled = false;
    let confirmation: Promise<void> | undefined;
    await act(async () => {
      confirmation = result.current
        .mutateAsync({ mealId: 42, preview_token: 'token-1', chosen_index: 0 })
        .then(() => {
          settled = true;
        });
      await Promise.resolve();
    });

    await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledTimes(2));
    const settledBeforeInvalidation = settled;
    await act(async () => {
      finishPlanInvalidation?.();
      await confirmation;
    });

    expect(settledBeforeInvalidation).toBe(false);
    expect(settled).toBe(true);
    client.clear();
  });
});
