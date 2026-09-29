import type { ActivityLevel, GoalType } from '@/shared/types/dietProfile';
import type { Gender } from '@/shared/types/user';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT: Record<GoalType, number> = {
  lose_weight: -500,
  gain_muscle: 300,
  maintain: 0,
  eat_healthier: 0,
  manage_condition: 0,
};

type EstimateInput = {
  weightKg: number;
  heightCm: number;
  /** Defaults to 30 if the caller has no real age (e.g. `date_of_birth` missing) — the onboarding
   * v2 flow collects an age slider and converts it to an approximate `date_of_birth` at register
   * (docs/onboarding-v2-flow-plan.md D3), so callers should normally pass a real value. This is
   * still just a mock estimate feeding decorative daily_calories/macros, never gating logic. */
  ageYears?: number;
  gender?: Gender | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
};

export type EstimatedDailyTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/**
 * A simple Mifflin-St Jeor estimate — mock-only stand-in for whatever calculation the real
 * backend runs (API_REFERENCE.md §5: "Targets auto-recalculate from weight/height/age/gender/
 * activity/goal"). Good enough to make the calibrating screen and diet-home numbers look real;
 * not meant to be nutritionally authoritative.
 */
export function estimateDailyTargets({
  weightKg,
  heightCm,
  ageYears = 30,
  gender,
  activityLevel,
  goalType,
}: EstimateInput): EstimatedDailyTargets {
  const sexOffset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78; // -78 ≈ midpoint, unknown/prefer-not-to-say
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexOffset;
  const tdee =
    bmr * (activityLevel ? ACTIVITY_MULTIPLIER[activityLevel] : ACTIVITY_MULTIPLIER.moderate);
  const calories = Math.max(
    1200,
    Math.round(tdee + (goalType ? GOAL_CALORIE_ADJUSTMENT[goalType] : 0)),
  );

  const proteinG = Math.round(weightKg * 1.6);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbsG, fatG };
}
