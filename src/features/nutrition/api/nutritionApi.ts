/**
 * TanStack Query hooks for the nutrition pillar — food tracking (API_REFERENCE.md §8) + daily
 * summary (§10). All server data flows through here; no screen fetches directly (architecture.md
 * §3–4). Food/daily-summary routes are Style B (bare payloads). Query keys come from the
 * `nutritionKeys` factory so mutations can invalidate precisely.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import type {
  DailyTotals,
  FoodEntry,
  FoodItem,
  FoodSource,
  MacroSummary,
  PhotoEstimate,
} from '@/shared/types/food';
import type { DailyLog, DailySummary } from '@/shared/types/dailyLog';
import type { ConfirmMealValues } from '@/features/nutrition/schemas';

/** Today as `YYYY-MM-DD` in the device's locale-independent ISO date. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const nutritionKeys = {
  all: ['nutrition'] as const,
  dailySummary: (date: string) => ['nutrition', 'daily-summary', date] as const,
  foodEntries: (date: string) => ['nutrition', 'food-entries', date] as const,
  foodSearch: (q: string) => ['nutrition', 'food-search', q] as const,
  barcode: (code: string) => ['nutrition', 'barcode', code] as const,
};

export type FoodEntriesResponse = { entries: FoodEntry[]; macro_summary: MacroSummary };
type CreatedFoodEntry = FoodEntry & { daily_totals: DailyTotals };

/** `GET /food/entries/?date=` — the day's entries + macro summary. Primary source for Diet home. */
export function useFoodEntriesQuery(date: string = todayISO()) {
  return useQuery({
    queryKey: nutritionKeys.foodEntries(date),
    queryFn: () => apiClient.get<FoodEntriesResponse>(`/food/entries/?date=${date}`),
  });
}

/** `GET /daily-summary/?date=` — full day payload (net calories, exercise). Wired fully in Layer 2. */
export function useDailySummaryQuery(date: string = todayISO()) {
  return useQuery({
    queryKey: nutritionKeys.dailySummary(date),
    queryFn: () => apiClient.get<DailySummary>(`/daily-summary/?date=${date}`),
  });
}

/** `PATCH /daily-summary/water/` — update today's water total, then refresh the day summary. */
export function useUpdateWaterMutation(date: string = todayISO()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (waterMl: number) =>
      apiClient.patch<DailyLog>('/daily-summary/water/', { water_ml: waterMl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}

/** `GET /food/search/?q=` — debounced food-DB search. Disabled until 2+ chars; keeps previous results. */
export function useFoodSearchQuery(q: string) {
  return useQuery({
    queryKey: nutritionKeys.foodSearch(q),
    queryFn: () => apiClient.get<FoodItem[]>(`/food/search/?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    placeholderData: (previous) => previous, // don't flash empty while the user keeps typing
  });
}

/** `GET /food/lookup/barcode/{barcode}/` — on-demand; enable once a code is captured/entered. */
export function useBarcodeLookup(code: string, enabled: boolean) {
  return useQuery({
    queryKey: nutritionKeys.barcode(code),
    queryFn: () => apiClient.get<FoodItem>(`/food/lookup/barcode/${encodeURIComponent(code)}/`),
    enabled: enabled && code.length > 0,
    retry: false, // a 404 "not found" is a normal outcome, not a transient error to retry
  });
}

export type PhotoUploadFile = { uri: string; name: string; type: string };

/**
 * `POST /food/photo/` (multipart) — returns an ESTIMATE only (§8). The caller routes the user to the
 * confirm screen with this prefill; it does NOT create an entry. 422/429 surface as `ApiError` and
 * are handled by the caller (fall back to manual entry).
 */
export function useAnalyzePhotoMutation() {
  return useMutation({
    mutationFn: (image: PhotoUploadFile) => {
      const form = new FormData();
      // RN's fetch accepts this file-part shape on FormData for multipart uploads.
      form.append('image', { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
      return apiClient.post<PhotoEstimate>('/food/photo/', form, { multipart: true });
    },
  });
}

/** `POST /food/entries/` — commit a confirmed entry. Invalidates the day's entries + summary. */
export function useCreateFoodEntryMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ConfirmMealValues & { source: FoodSource }) =>
      apiClient.post<CreatedFoodEntry>('/food/entries/', {
        date,
        meal_type: values.meal_type,
        food_name: values.food_name,
        calories: values.calories,
        protein_g: values.protein_g,
        carbs_g: values.carbs_g,
        fat_g: values.fat_g,
        source: values.source,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.foodEntries(date) });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}

/** `DELETE /food/entries/{id}/` — optimistic removal with rollback, then reconcile via invalidation. */
export function useDeleteFoodEntryMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => apiClient.delete<void>(`/food/entries/${entryId}/`),
    onMutate: async (entryId) => {
      await queryClient.cancelQueries({ queryKey: nutritionKeys.foodEntries(date) });
      const previous = queryClient.getQueryData<FoodEntriesResponse>(nutritionKeys.foodEntries(date));
      if (previous) {
        queryClient.setQueryData<FoodEntriesResponse>(nutritionKeys.foodEntries(date), {
          ...previous,
          entries: previous.entries.filter((entry) => entry.id !== entryId),
        });
      }
      return { previous };
    },
    onError: (_error, _entryId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(nutritionKeys.foodEntries(date), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.foodEntries(date) });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}
