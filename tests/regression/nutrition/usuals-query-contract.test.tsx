/**
 * Issue #27 — "Your usuals" on screen 25a is fed by `GET /food/usuals/`
 * (`apps/food_tracking/urls.py:9`, view `apps/food_tracking/views.py:126-136`, service
 * `apps/food_tracking/services/usuals.py:35-51,119-178`). This is the first frontend consumer of
 * that endpoint. Protects the new `useUsualsQuery` hook's contract: it calls the right URL with
 * `meal_type`, parses a response shaped exactly like `services/usuals.py:166-178` (including
 * `food_item` as a nullable number and `portion_g`), and rejects a response missing a required
 * field instead of silently passing through bad data.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useUsualsQuery } from '@/features/nutrition/api/nutritionApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

const VALID_SUGGESTION = {
  kind: 'repeat',
  food_name: 'Rice bowl, paneer',
  meal_type: 'lunch',
  calories: 640,
  protein_g: 32,
  carbs_g: 74,
  fat_g: 22,
  portion_g: 350,
  food_item: 12,
  reason_label: 'Most weekday afternoons',
  times_logged: 4,
  last_logged_on: '2026-10-14',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('nutrition: useUsualsQuery contract (GET /food/usuals/, issue #27)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls GET /food/usuals/ with the given meal_type', async () => {
    mockGet.mockResolvedValue({
      meal_type: 'lunch',
      observed_at: '2026-10-16T13:00:00+00:00',
      suggestions: [VALID_SUGGESTION],
    });

    const { result } = renderHook(() => useUsualsQuery('lunch'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/food/usuals/'));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('meal_type=lunch'));
  });

  it('parses a valid response into typed suggestions matching services/usuals.py:166-178', async () => {
    mockGet.mockResolvedValue({
      meal_type: 'lunch',
      observed_at: '2026-10-16T13:00:00+00:00',
      suggestions: [VALID_SUGGESTION],
    });

    const { result } = renderHook(() => useUsualsQuery('lunch'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.suggestions).toEqual([VALID_SUGGESTION]);
  });

  it('treats a nullable food_item as valid (no food_item match for this suggestion)', async () => {
    mockGet.mockResolvedValue({
      meal_type: 'lunch',
      observed_at: '2026-10-16T13:00:00+00:00',
      suggestions: [{ ...VALID_SUGGESTION, food_item: null }],
    });

    const { result } = renderHook(() => useUsualsQuery('lunch'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.suggestions[0].food_item).toBeNull();
  });

  it('rejects a response missing a required field instead of passing it through', async () => {
    const { food_name: _omit, ...withoutFoodName } = VALID_SUGGESTION;
    mockGet.mockResolvedValue({
      meal_type: 'lunch',
      observed_at: '2026-10-16T13:00:00+00:00',
      suggestions: [withoutFoodName],
    });

    const { result } = renderHook(() => useUsualsQuery('lunch'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
