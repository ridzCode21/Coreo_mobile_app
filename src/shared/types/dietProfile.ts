/**
 * The diet-profile domain shape — mirrors `GET/PUT /users/me/diet-profile/` exactly
 * (API_REFERENCE.md §5/§17) so the mock and the eventual live API are structurally identical.
 * Lives in `shared/` (not `features/onboarding/`) because it's consumed by 2+ features: onboarding
 * (the interview that fills it in) and, later, nutrition/profile screens that read it back.
 */

export const GOAL_TYPES = [
  'lose_weight',
  'maintain',
  'gain_muscle',
  'eat_healthier',
  'manage_condition',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const DIET_TYPES = [
  'vegetarian',
  'vegan',
  'non_veg',
  'eggetarian',
  'jain',
  'keto',
  'low_carb',
] as const;
export type DietType = (typeof DIET_TYPES)[number];

export const CUISINE_PREFERENCES = [
  'indian',
  'south_indian',
  'north_indian',
  'mediterranean',
  'any',
] as const;
export type CuisinePreference = (typeof CUISINE_PREFERENCES)[number];

export const BUDGET_TIERS = ['budget_friendly', 'moderate', 'premium'] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const EATING_PATTERNS = [
  'home_food',
  'office_lunchbox',
  'frequent_restaurants',
  'hostel_pg',
  'mixed',
] as const;
export type EatingPattern = (typeof EATING_PATTERNS)[number];

export const COOKING_FREQUENCIES = [
  'every_meal',
  'once_daily',
  'batch_cooking',
  'minimal_cooking',
] as const;
export type CookingFrequency = (typeof COOKING_FREQUENCIES)[number];

export const HEALTH_CONDITIONS = [
  'diabetes',
  'pcos',
  'thyroid',
  'heart_health',
  'high_bp',
  'glp_1',
  'none',
  'prefer_not_to_say',
] as const;
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];
export const HEALTH_CONDITIONS_MAX = 3;

export const TARGET_SOURCES = ['calculated', 'manual'] as const;
export type TargetSource = (typeof TARGET_SOURCES)[number];

export type DietProfile = {
  onboarding_complete: boolean;
  goal_type: GoalType | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  diet_type: DietType | null;
  allergies: string[];
  disliked_foods: string[];
  cuisine_preference: CuisinePreference | null;
  cooking_time_max: number;
  meal_frequency: number;
  budget_tier: BudgetTier | null;
  eating_pattern: EatingPattern | null;
  cooking_frequency: CookingFrequency | null;
  health_conditions: HealthCondition[];
  target_source: TargetSource;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
};

/** A partial update — every field is optional (bare/partial PUT semantics, §5). */
export type DietProfilePatch = Partial<DietProfile>;

/**
 * `onboarding_complete` per the API's own definition (§5): true once `goal_type`, `diet_type`,
 * and `cuisine_preference` are all set. Kept here so mock and any future client-side check agree.
 */
export function computeOnboardingComplete(
  profile: Pick<DietProfile, 'goal_type' | 'diet_type' | 'cuisine_preference'>,
): boolean {
  return Boolean(profile.goal_type && profile.diet_type && profile.cuisine_preference);
}
