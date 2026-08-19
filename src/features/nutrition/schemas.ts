/**
 * Zod schemas for the nutrition feature's forms. Defined once here and reused for both the
 * `zodResolver` and the typed submit payload (architecture.md §3). The confirm form is the single
 * funnel every logging path (search/manual/photo/barcode) flows into before committing an entry.
 */

import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

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
  source: z.enum(['manual', 'photo', 'barcode']).default('manual'),
  prefill: z.string().optional(),
});
export type ConfirmRouteParams = z.infer<typeof confirmRouteParamsSchema>;

/** The shape a caller may stringify into the `prefill` route param (all optional — blank = manual). */
export const confirmPrefillSchema = z.object({
  food_name: z.string().optional(),
  meal_type: mealTypeSchema.optional(),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
  carbs_g: z.number().optional(),
  fat_g: z.number().optional(),
});
export type ConfirmPrefill = z.infer<typeof confirmPrefillSchema>;
