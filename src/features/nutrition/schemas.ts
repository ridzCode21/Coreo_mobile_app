/**
 * Zod schemas for the nutrition feature's forms. Defined once here and reused for both the
 * `zodResolver` and the typed submit payload (architecture.md §3). The confirm form is the single
 * funnel every logging path (search/manual/photo/barcode) flows into before committing an entry.
 */

import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

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

export const replacedFromParamSchema = z.object({
  name: z.string(),
  calories_kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});
export type ReplacedFromParam = z.infer<typeof replacedFromParamSchema>;
