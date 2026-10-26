/**
 * Issue #38, round 2 — `useFoodItemsQuery` for the now-shipped `GET /food/items/`
 * (apps/food_tracking/views.py:107-114): a bare array of `<FoodItem>`, newest first, powering 32a
 * "My foods" / 32b "My foods · empty". Also protects that saving a new food
 * (`useCreateFoodItemMutation`) invalidates this list's cache, not just search, so a newly added
 * food shows up on 32a without a manual refresh.
 */
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  nutritionKeys,
  useCreateFoodItemMutation,
  useFoodItemsQuery,
} from '@/features/nutrition/api/nutritionApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

const MOMS_DAL = {
  id: 7,
  barcode: null,
  name: "Mom's dal",
  calories_per_100g: 182,
  protein_g_per_100g: 9,
  carbs_g_per_100g: 22,
  fat_g_per_100g: 6,
  source: 'custom',
  last_fetched: '2026-07-01T00:00:00Z',
};

function wrapperWithClient(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('nutritionApi: useFoodItemsQuery (issue #38)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /food/items/ and parses the bare FoodItem array', async () => {
    mockGet.mockResolvedValue([MOMS_DAL]);

    const { result } = renderHook(() => useFoodItemsQuery(), {
      wrapper: wrapperWithClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/food/items/');
    expect(result.current.data).toEqual([MOMS_DAL]);
  });

  it('resolves to an empty array when the caller has no custom foods', async () => {
    mockGet.mockResolvedValue([]);

    const { result } = renderHook(() => useFoodItemsQuery(), {
      wrapper: wrapperWithClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('saving a new food invalidates the cached My Foods list, not just search', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    mockPost.mockResolvedValue(MOMS_DAL);

    const { result } = renderHook(() => useCreateFoodItemMutation(), {
      wrapper: wrapperWithClient(client),
    });

    result.current.mutate({
      name: "Mom's dal",
      calories_per_100g: 182,
      protein_g_per_100g: 9,
      carbs_g_per_100g: 22,
      fat_g_per_100g: 6,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(nutritionKeys.foodItems);
  });
});
