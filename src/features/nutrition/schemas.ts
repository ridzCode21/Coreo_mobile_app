/**
 * Zod schemas for the nutrition feature's forms. Defined once here and reused for both the
 * `zodResolver` and the typed submit payload (architecture.md §3). The confirm form is the single
 * funnel every logging path (search/manual/photo/barcode) flows into before committing an entry.
 */

import { z } from 'zod';

import type { MealPlanDetail } from '@/shared/types/mealPlan';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const recipeJsonSchema = z.object({
  name: z.string(),
  servings: z.string(),
  prep_time_minutes: z.number().int(),
  cook_time_minutes: z.number().int(),
  ingredients: z.array(z.object({ item: z.string(), quantity: z.string() })),
  steps: z.array(z.object({ step: z.number().int().positive(), instruction: z.string() })),
  nutrition_note: z.string(),
  checked_nutrition: z.object({
    calories_kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    source: z.literal('food_records'),
    trace: z.array(z.object({}).passthrough()),
  }),
});

const planActionQuotaSchema = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});

/**
 * The quota shape added to successful `GET /meal-plans/{date}/` responses by
 * `MealPlanDetailView` (apps/meals/views.py). The current backend
 * returns it on every successful detail response; the optional parser permits
 * legacy payloads while preserving the no-plan 404 as a non-detail response.
 * Only the new `quota` field is validated; the rest of the detail payload is
 * still typed, not parsed.
 */
const mealPlanDetailResponseSchema = z
  .object({
    quota: z
      .object({
        tier: z.enum(['free', 'premium']),
        quota_resets_at: z.string(),
        plan_generate: planActionQuotaSchema,
        plan_regenerate: planActionQuotaSchema,
      })
      .optional()
      .catch(undefined),
  })
  .passthrough();

export function parseMealPlanDetailResponse(response: unknown): MealPlanDetail {
  return mealPlanDetailResponseSchema.parse(response) as MealPlanDetail;
}

export const photoUnreadableRouteParamsSchema = z.object({
  title: z.string().trim().min(1).optional().catch(undefined),
  message: z.string().trim().min(1).optional().catch(undefined),
  mealType: mealTypeSchema.optional().catch(undefined),
});

export const usualsSuggestionSchema = z.object({
  kind: z.enum(['repeat', 'yesterday']),
  food_name: z.string(),
  meal_type: mealTypeSchema,
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  portion_g: z.number().nullable(),
  food_item: z.number().nullable(),
  reason_label: z.string(),
  times_logged: z.number().int(),
  last_logged_on: z.string(),
});

export const usualsResponseSchema = z.object({
  meal_type: mealTypeSchema,
  observed_at: z.string(),
  suggestions: z.array(usualsSuggestionSchema).max(3),
});
export type UsualsResponse = z.infer<typeof usualsResponseSchema>;

export const weeklyDietReviewDaySchema = z.object({
  date: z.string().date(),
  weekday: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  calories_in: z.number().int().nonnegative(),
  protein_g: z.number().nonnegative(),
  weight_kg: z.number().nullable(),
  target_calories: z.number().int().nonnegative().nullable(),
  on_target: z.boolean(),
  late_dinner: z.boolean(),
});

export const weeklyDietReviewTargetChangeSchema = z.object({
  previous_calories: z.number().int().nonnegative().nullable(),
  new_calories: z.number().int().nonnegative(),
  changed_at: z.string().datetime({ offset: true }),
  source: z.enum(['manual', 'calculated']),
  note: z.string(),
});

export const weeklyDietReviewSchema = z.object({
  week_start: z.string().date(),
  week_end: z.string().date(),
  generated_at: z.string().datetime({ offset: true }),
  days_on_target: z.number().int().min(0).max(7),
  headline: z.string().min(1),
  subtitle: z.string(),
  adherence_line: z.string().min(1),
  pattern_callout: z.string().min(1),
  recommendation: z.object({
    title: z.string().min(1),
    detail: z.string().min(1),
  }),
  days: z.array(weeklyDietReviewDaySchema).length(7),
  target_changes: z.array(weeklyDietReviewTargetChangeSchema),
});

/**
 * The editable "Check my math" confirm form (15a). Photo/barcode/search all prefill this, then the
 * user edits and commits. Numbers are non-negative and capped at sane ceilings so a fat-fingered
 * entry can't poison the day's totals. Mirrors the `POST /food/entries/` payload (API_REFERENCE §8).
 */
export const confirmMealSchema = z.object({
  food_name: z.string().trim().min(1, 'Give it a name'),
  meal_type: mealTypeSchema,
  calories: z.coerce.number().min(0, 'Cannot be negative').max(10000),
  protein_g: z.coerce.number().min(0, 'Cannot be negative').max(1000),
  carbs_g: z.coerce.number().min(0, 'Cannot be negative').max(1000),
  fat_g: z.coerce.number().min(0, 'Cannot be negative').max(1000),
});
export type ConfirmMealValues = z.infer<typeof confirmMealSchema>;

const requiredMacro = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number().min(0, 'Cannot be negative').max(maximum),
  );

/** The custom-food form and `POST /food/items/` payload, expressed per 100 grams. */
export const addFoodSchema = z.object({
  name: z.string().trim().min(1, 'Give it a name').max(255, 'Keep the name under 256 characters'),
  calories_per_100g: requiredMacro(10000),
  protein_g_per_100g: requiredMacro(1000),
  carbs_g_per_100g: requiredMacro(1000),
  fat_g_per_100g: requiredMacro(1000),
});
export type AddFoodValues = z.infer<typeof addFoodSchema>;

/** Bare `<FoodItem>` response returned by `POST /food/items/`. */
export const foodItemSchema = z.object({
  id: z.number().int(),
  barcode: z.string().nullable(),
  name: z.string(),
  calories_per_100g: z.number(),
  protein_g_per_100g: z.number(),
  carbs_g_per_100g: z.number(),
  fat_g_per_100g: z.number(),
  source: z.string(),
  last_fetched: z.string(),
});

/** Manual-entry alias — identical today; kept separate so the two forms can diverge without churn. */
export const manualEntrySchema = confirmMealSchema;
export type ManualEntryValues = z.infer<typeof manualEntrySchema>;

/**
 * Route params for `(app)/(tabs)/diet/confirm` — validated at the navigation boundary rather than
 * trusted blindly (architecture.md §5). All arrive as strings from the router; `prefill` is an
 * optional JSON blob the caller stringifies.
 */
export const confirmRouteParamsSchema = z.object({
  source: z.enum(['manual', 'photo', 'barcode', 'label_ocr']).default('manual'),
  prefill: z.string().optional(),
});
export type ConfirmRouteParams = z.infer<typeof confirmRouteParamsSchema>;

export const photoResultRouteParamsSchema = z.object({
  prefill: z.string().min(1),
  photoUri: z.string().min(1),
});

export const photoReceiptRouteParamsSchema = z.object({
  summary: z.string().min(1),
});

export const labelResultRouteParamsSchema = z.object({
  prefill: z.string().min(1),
});

export const labelResultPrefillSchema = z.object({
  name: z.string(),
  portion_grams: z.number(),
  est_calories: z.number(),
  est_protein_g: z.number(),
  est_carbs_g: z.number(),
  est_fat_g: z.number(),
  servings_per_container: z.number().positive().nullable(),
  confidence: z.number().min(0).max(1),
  guessed: z.boolean(),
  guess_note: z.string().nullable(),
  remembered: z.boolean(),
  serving_size_text: z.string().nullable(),
});
export type LabelResultPrefill = z.infer<typeof labelResultPrefillSchema>;

export const labelUnreadableRouteParamsSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
});

export const photoEstimateItemSchema = z.object({
  name: z.string(),
  portion_label: z.string().nullable(),
  portion_grams: z.number(),
  est_calories: z.number(),
  est_protein_g: z.number(),
  est_carbs_g: z.number(),
  est_fat_g: z.number(),
  confidence: z.number().min(0).max(1),
  guessed: z.boolean(),
  guess_note: z.string().nullable(),
  remembered: z.boolean(),
});

export const photoEstimateSchema = z.object({
  name: z.string(),
  portion_grams: z.number(),
  est_calories: z.number(),
  est_protein_g: z.number(),
  est_carbs_g: z.number(),
  est_fat_g: z.number(),
  guessed_count: z.number().int().nonnegative(),
  items: z.array(photoEstimateItemSchema),
});

/** The shape a caller may stringify into the `prefill` route param (all optional — blank = manual). */
export const confirmPrefillSchema = z.object({
  food_name: z.string().optional(),
  meal_type: mealTypeSchema.optional(),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
  guessed_count: z.number().int().nonnegative().optional(),
  items: z.array(photoEstimateItemSchema).optional(),
});
export type ConfirmPrefill = z.infer<typeof confirmPrefillSchema>;

export const photoResultPrefillSchema = z.object({
  food_name: z.string(),
  meal_type: mealTypeSchema.optional(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  guessed_count: z.number().int().nonnegative(),
  items: z.array(photoEstimateItemSchema).min(1),
});
export type PhotoResultPrefill = z.infer<typeof photoResultPrefillSchema>;

export const photoReceiptSummarySchema = z.object({
  food_name: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  meal_type: mealTypeSchema,
  items: z.array(photoEstimateItemSchema),
});
export type PhotoReceiptSummary = z.infer<typeof photoReceiptSummarySchema>;
