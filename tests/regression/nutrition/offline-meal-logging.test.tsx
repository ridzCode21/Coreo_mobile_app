/**
 * Issue #49 — a meal logged with no connection is saved to the queue (not lost, not an error) and
 * is sent, then Home's data refreshed, when the connection returns.
 */

import type { PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/shared/api/errors';
import { queryClient as appQueryClient } from '@/shared/api/queryClient';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { STORAGE_KEYS } from '@/shared/lib/storage';
import {
  nutritionKeys,
  useCreateFoodEntriesMutation,
  useCreateFoodEntryMutation,
  type CreateFoodEntryInput,
} from '@/features/nutrition/api/nutritionApi';
import { syncMealQueue, useMealQueueSync } from '@/features/nutrition/api/mealQueueSync';
import { useMealQueueStore } from '@/features/nutrition/store/mealQueueStore';

const mockPost = jest.fn();
jest.mock('@/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: (...args: unknown[]) => mockPost(...args),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const DATE = '2026-07-07';

const rice: CreateFoodEntryInput = {
  food_name: 'Rice bowl',
  meal_type: 'lunch',
  calories: 520,
  protein_g: 24,
  carbs_g: 70,
  fat_g: 14,
  source: 'manual',
};
const dal: CreateFoodEntryInput = { ...rice, food_name: 'Dal', calories: 300 };

function setup() {
  // The app's own defaults (mutations run even offline), so the test sees real behaviour.
  const queryClient = new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('nutrition: offline meal logging (issue #49)', () => {
  beforeEach(async () => {
    mockPost.mockReset();
    mockPost.mockImplementation(async (_path: string, body: { food_name: string }) => ({
      id: 1,
      ...body,
    }));
    await AsyncStorage.clear();
    await useMealQueueStore.getState().clear();
    useMealQueueStore.setState({ hydrated: false });
    useConnectivityStore.setState({ networkOnline: true, simulatedOffline: false, isOnline: true });
  });

  it('online: posts straight away and queues nothing', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateFoodEntryMutation(DATE), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(rice);
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(useMealQueueStore.getState().queue).toEqual([]);
  });

  it('offline: saves the meal to the queue, does not call the server, and succeeds', async () => {
    useConnectivityStore.getState().setSimulatedOffline(true);
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateFoodEntryMutation(DATE), { wrapper });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync(rice);
    });
    expect(outcome).toEqual({ queued: true });
    expect(mockPost).not.toHaveBeenCalled();
    const [saved] = useMealQueueStore.getState().queue;
    expect(saved).toMatchObject({
      date: DATE,
      status: 'pending',
      entry: { food_name: 'Rice bowl' },
    });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toContain('Rice bowl');
  });

  it('queues only what is not yet saved when the connection drops part-way through a photo meal', async () => {
    mockPost.mockResolvedValueOnce({ id: 1 }).mockRejectedValueOnce(ApiError.network());
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateFoodEntriesMutation(DATE), { wrapper });
    await act(async () => {
      await result.current.mutateAsync([rice, dal]);
    });
    expect(useMealQueueStore.getState().queue.map((m) => m.entry.food_name)).toEqual(['Dal']);
  });

  it('a normal server refusal is still an error (not queued)', async () => {
    mockPost.mockRejectedValueOnce(new ApiError('bad', 'validation', 422));
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateFoodEntryMutation(DATE), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(rice)).rejects.toBeInstanceOf(ApiError);
    });
    expect(useMealQueueStore.getState().queue).toEqual([]);
  });

  it('shows the normal save error if the queue is full', async () => {
    useConnectivityStore.getState().setSimulatedOffline(true);
    const full = Array.from({ length: 50 }, (_, i) => ({
      id: `m${i}`,
      createdAt: '2026-07-07T10:00:00.000Z',
      date: DATE,
      entry: { ...rice, portion_g: undefined },
    }));
    await useMealQueueStore.getState().enqueue(full);
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateFoodEntryMutation(DATE), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(rice)).rejects.toMatchObject({ kind: 'network' });
    });
    expect(useMealQueueStore.getState().queue).toHaveLength(50);
  });

  it('on reconnect sends the queued meals once, in order, and refreshes the nutrition data', async () => {
    useConnectivityStore.getState().setSimulatedOffline(true);
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const mutation = renderHook(() => useCreateFoodEntriesMutation(DATE), { wrapper });
    await act(async () => {
      await mutation.result.current.mutateAsync([rice, dal]);
    });
    expect(mockPost).not.toHaveBeenCalled();

    renderHook(() => useMealQueueSync(), { wrapper });
    act(() => {
      useConnectivityStore.getState().setSimulatedOffline(false);
      // A second reconnect event right behind the first must not send anything twice.
      useConnectivityStore.getState().setNetworkSnapshot({ isConnected: true });
    });

    await waitFor(() => expect(useMealQueueStore.getState().queue).toEqual([]));
    expect(mockPost.mock.calls.map(([, body]) => body.food_name)).toEqual(['Rice bowl', 'Dal']);
    expect(mockPost.mock.calls[0][1]).toMatchObject({ date: DATE });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: nutritionKeys.all }));
  });

  it('syncMealQueue called twice at once sends each meal once', async () => {
    await useMealQueueStore
      .getState()
      .enqueue([{ id: 'a', createdAt: '2026-07-07T10:00:00.000Z', date: DATE, entry: rice }]);
    const { queryClient } = setup();
    await Promise.all([syncMealQueue(queryClient), syncMealQueue(queryClient)]);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('keeps a meal the server rejects instead of losing it', async () => {
    await useMealQueueStore
      .getState()
      .enqueue([{ id: 'a', createdAt: '2026-07-07T10:00:00.000Z', date: DATE, entry: rice }]);
    mockPost.mockRejectedValueOnce(new ApiError('bad', 'validation', 422));
    const { queryClient } = setup();
    await syncMealQueue(queryClient);
    expect(useMealQueueStore.getState().queue).toMatchObject([{ id: 'a', status: 'rejected' }]);
  });
});
