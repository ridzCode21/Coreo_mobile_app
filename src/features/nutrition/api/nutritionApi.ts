/**
 * TanStack Query hooks for the nutrition pillar — food tracking (API_REFERENCE.md §8) + daily
 * summary (§10). All server data flows through here; no screen fetches directly (architecture.md
 * §3–4). Food/daily-summary routes are Style B (bare payloads). Query keys come from the
 * `nutritionKeys` factory so mutations can invalidate precisely.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';
import type {
  AiGuess,
  DailyTotals,
  FoodEntriesMacroSummary,
  FoodEntry,
  FoodItem,
  FoodSource,
  LabelEstimate,
  MacroSummary,
  PhotoEstimate,
} from '@/shared/types/food';
import type { DailyLog, DailySummary } from '@/shared/types/dailyLog';
import { photoEstimateSchema, type ConfirmMealValues } from '@/features/nutrition/schemas';

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

const macroBudgetEntrySchema = z.object({
  consumed: z.number(),
  target: z.number(),
  remaining: z.number(),
  over: z.boolean(),
});

const foodEntryResponseSchema = z.object({
  id: z.number(),
  date: z.string(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_item: z.number().nullable(),
  food_name: z.string(),
  portion_g: z.number().nullable(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  source: z.enum(['photo', 'barcode', 'manual', 'import', 'plan', 'quick_add', 'label_ocr']),
  ai_guess: z
    .object({
      name: z.string(),
      portion_grams: z.number().nullable(),
      est_calories: z.number(),
      est_protein_g: z.number(),
      est_carbs_g: z.number(),
      est_fat_g: z.number(),
      confidence: z.number(),
    })
    .nullable(),
  created_at: z.string(),
});

const foodEntriesApiResponseSchema = z.object({
  entries: z.array(foodEntryResponseSchema),
  macro_summary: z.object({
    calories: macroBudgetEntrySchema,
    protein_g: macroBudgetEntrySchema,
    carbs_g: macroBudgetEntrySchema,
    fat_g: macroBudgetEntrySchema,
  }),
});

export type FoodEntriesApiResponse = {
  entries: FoodEntry[];
  macro_summary: FoodEntriesMacroSummary;
};

/** Includes the retired flat shape only so older test fixtures remain source-compatible. */
export type FoodEntriesResponse = {
  entries: FoodEntry[];
  macro_summary: FoodEntriesMacroSummary | MacroSummary;
};
type CreatedFoodEntry = FoodEntry & { daily_totals: DailyTotals };

/** `GET /food/entries/?date=` — the day's entries + macro summary. Primary source for Diet home. */
export function useFoodEntriesQuery(date: string = todayISO()) {
  return useQuery({
    queryKey: nutritionKeys.foodEntries(date),
    queryFn: async (): Promise<FoodEntriesApiResponse> => {
      const response = await apiClient.get<unknown>(`/food/entries/?date=${date}`);
      return foodEntriesApiResponseSchema.parse(response);
    },
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

function imageFormData(image: PhotoUploadFile): FormData {
  const form = new FormData();
  // RN's fetch accepts this file-part shape on FormData for multipart uploads.
  form.append('image', {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as unknown as Blob);
  return form;
}

/**
 * `POST /food/photo/` (multipart) — returns an ESTIMATE only (§8). The caller routes the user to the
 * confirm screen with this prefill; it does NOT create an entry. 422/429 surface as `ApiError` and
 * are handled by the caller (fall back to manual entry).
 */
export function useAnalyzePhotoMutation() {
  return useMutation({
    mutationFn: async (image: PhotoUploadFile): Promise<PhotoEstimate> => {
      const response = await apiClient.post<unknown>('/food/photo/', imageFormData(image), {
        multipart: true,
      });
      return photoEstimateSchema.parse(response);
    },
  });
}

/** `POST /food/label-ocr/` (multipart) — returns a per-serving label estimate only (§8). */
export function useAnalyzeLabelMutation() {
  return useMutation({
    mutationFn: (image: PhotoUploadFile) =>
      apiClient.post<LabelEstimate>('/food/label-ocr/', imageFormData(image), { multipart: true }),
  });
}

export type CreateFoodEntryInput = ConfirmMealValues & {
  source: FoodSource;
  portion_g?: number | null;
  ai_guess?: AiGuess;
};

function postFoodEntry(date: string, values: CreateFoodEntryInput) {
  return apiClient.post<CreatedFoodEntry>('/food/entries/', {
    date,
    meal_type: values.meal_type,
    food_name: values.food_name,
    ...(values.portion_g !== undefined ? { portion_g: values.portion_g } : {}),
    calories: values.calories,
    protein_g: values.protein_g,
    carbs_g: values.carbs_g,
    fat_g: values.fat_g,
    source: values.source,
    ...(values.ai_guess !== undefined ? { ai_guess: values.ai_guess } : {}),
  });
}

/** `POST /food/entries/` — commit a confirmed entry. Invalidates the day's entries + summary. */
export function useCreateFoodEntryMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateFoodEntryInput) => postFoodEntry(date, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.foodEntries(date) });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}

/** Commit photo line items sequentially, then refresh the day once all items have saved. */
export function useCreateFoodEntriesMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: CreateFoodEntryInput[]) => {
      const created: CreatedFoodEntry[] = [];
      for (const entry of entries) created.push(await postFoodEntry(date, entry));
      return created;
    },
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
      const previous = queryClient.getQueryData<FoodEntriesResponse>(
        nutritionKeys.foodEntries(date),
      );
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
