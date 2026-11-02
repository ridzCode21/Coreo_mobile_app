import { z } from 'zod';

import {
  ACTIVITY_LEVELS,
  BUDGET_TIERS,
  COOKING_FREQUENCIES,
  CUISINE_PREFERENCES,
  DIET_TYPES,
  HEALTH_CONDITIONS,
  HEALTH_CONDITIONS_MAX,
  MEAL_RHYTHMS,
  PACES,
  WEAK_MOMENTS,
  WHO_COOKS,
} from '@/shared/types/dietProfile';

/**
 * Mirrors the choice-field enums `PUT /users/me/diet-profile/` accepts (API_REFERENCE.md §5/§17).
 * Used to type/validate the incremental patch each diet-interview question sends — most steps are
 * select-driven, and documents the contract in one place, per architecture.md §3 ("Zod schemas
 * shared between form validation and API payload typing").
 */
export const dietProfilePatchSchema = z.object({
  diet_type: z.enum(DIET_TYPES).nullable().optional(),
  allergies: z.array(z.string()).optional(),
  disliked_foods: z.array(z.string()).optional(),
  cuisine_preference: z.enum(CUISINE_PREFERENCES).nullable().optional(),
  target_weight_kg: z.number().nullable().optional(),
  activity_level: z.enum(ACTIVITY_LEVELS).nullable().optional(),
  cooking_frequency: z.enum(COOKING_FREQUENCIES).nullable().optional(),
  pace: z.enum(PACES).optional(),
  who_cooks: z.enum(WHO_COOKS).optional(),
  meal_rhythm: z.enum(MEAL_RHYTHMS).optional(),
  weak_moment: z.enum(WEAK_MOMENTS).optional(),
  meal_frequency: z.number().int().positive().nullable().optional(),
  budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
  health_conditions: z.array(z.enum(HEALTH_CONDITIONS)).max(HEALTH_CONDITIONS_MAX).optional(),
});

export type DietProfilePatchValues = z.infer<typeof dietProfilePatchSchema>;

const aboutYouMeasurementMessages = {
  ageYears: 'Age must be between 16 and 90.',
  heightCm: 'Height must be between 140 and 210 cm.',
  weightKg: 'Weight must be between 40 and 160 kg.',
} as const;

/**
 * Client-side bounds for the persisted values collected by AboutYouScreen's sliders. These match
 * the slider ranges so stale drafts cannot bypass the product's normal input limits.
 */
export const aboutYouMeasurementsSchema = z.object({
  ageYears: z
    .number()
    .min(16, aboutYouMeasurementMessages.ageYears)
    .max(90, aboutYouMeasurementMessages.ageYears),
  heightCm: z
    .number()
    .min(140, aboutYouMeasurementMessages.heightCm)
    .max(210, aboutYouMeasurementMessages.heightCm),
  weightKg: z
    .number()
    .min(40, aboutYouMeasurementMessages.weightKg)
    .max(160, aboutYouMeasurementMessages.weightKg),
});

export type AboutYouMeasurementsValues = z.infer<typeof aboutYouMeasurementsSchema>;

/** The "off the table" (D2/12a·2) free-add text entry — allergy/disliked-food names typed via
 * `VoiceInputBar` rather than picked from a preset chip. */
export const freeFoodEntrySchema = z
  .string()
  .trim()
  .min(1, 'Type something first')
  .max(40, 'Keep it short');
