import { z } from 'zod';

import {
  ACTIVITY_LEVELS,
  BUDGET_TIERS,
  COOKING_FREQUENCIES,
  CUISINE_PREFERENCES,
  DIET_TYPES,
  HEALTH_CONDITIONS,
  HEALTH_CONDITIONS_MAX,
} from '@/shared/types/dietProfile';

/**
 * Mirrors the choice-field enums `PUT /users/me/diet-profile/` accepts (API_REFERENCE.md §5/§17).
 * Used to type/validate the incremental patch each diet-interview question sends — most steps are
 * select-driven (`dietQuestions.ts` options are already restricted to these values by
 * construction), so this mainly guards the one bit of real text entry in the flow (the "off the
 * table" free-add field) and documents the contract in one place, per architecture.md §3 ("Zod
 * schemas shared between form validation and API payload typing").
 */
export const dietProfilePatchSchema = z.object({
  diet_type: z.enum(DIET_TYPES).nullable().optional(),
  allergies: z.array(z.string()).optional(),
  disliked_foods: z.array(z.string()).optional(),
  cuisine_preference: z.enum(CUISINE_PREFERENCES).nullable().optional(),
  target_weight_kg: z.number().positive().nullable().optional(),
  activity_level: z.enum(ACTIVITY_LEVELS).nullable().optional(),
  cooking_frequency: z.enum(COOKING_FREQUENCIES).nullable().optional(),
  meal_frequency: z.number().int().positive().nullable().optional(),
  budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
  health_conditions: z.array(z.enum(HEALTH_CONDITIONS)).max(HEALTH_CONDITIONS_MAX).optional(),
});

export type DietProfilePatchValues = z.infer<typeof dietProfilePatchSchema>;

/** The "off the table" (D2/12a·2) free-add text entry — allergy/disliked-food names typed via
 * `VoiceInputBar` rather than picked from a preset chip. */
export const freeFoodEntrySchema = z
  .string()
  .trim()
  .min(1, 'Type something first')
  .max(40, 'Keep it short');
