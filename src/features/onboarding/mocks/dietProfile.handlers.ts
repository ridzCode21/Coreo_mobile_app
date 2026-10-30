import { registerMock } from '@/shared/api/mock/router';
import { mockDb } from '@/shared/api/mock/db';
import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import {
  computeOnboardingComplete,
  HEALTH_CONDITIONS_MAX,
  type DietProfile,
  type DietProfilePatch,
} from '@/shared/types/dietProfile';
import { estimateDailyTargets } from '@/features/onboarding/lib/estimateDailyTargets';
import { dietProfilePatchSchema } from '@/features/onboarding/schemas';

const DEFAULT_CHECK_IN_TIME = '22:00';

const DEFAULT_DIET_PROFILE: DietProfile = {
  onboarding_complete: false,
  goal_type: null,
  weight_kg: null,
  target_weight_kg: null,
  height_cm: null,
  activity_level: null,
  diet_type: null,
  allergies: [],
  disliked_foods: [],
  cuisine_preference: null,
  cooking_time_max: 30,
  meal_frequency: 4,
  budget_tier: null,
  eating_pattern: null,
  cooking_frequency: null,
  pace: null,
  who_cooks: null,
  meal_rhythm: null,
  weak_moment: null,
  health_conditions: [],
  target_source: 'calculated',
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 60,
  late_night_guard: {
    enabled: false,
    check_in_time: DEFAULT_CHECK_IN_TIME,
    next_check_in_at: null,
    status_line: 'Late-night guard is off.',
  },
};

/** Mock-only: derives a whole-years age from the user's (possibly approximate — see D3 in
 * onboarding-v2-flow-plan.md) `date_of_birth`, for `estimateDailyTargets`. */
function ageFromDob(dob: string | null): number | undefined {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

function getOrCreateProfile(userId: string): DietProfile {
  const existing = mockDb.dietProfiles[userId];
  if (existing) return existing;
  const created: DietProfile = { ...DEFAULT_DIET_PROFILE };
  mockDb.dietProfiles[userId] = created;
  return created;
}

function validatePatch(patch: DietProfilePatch): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};

  if (patch.allergies !== undefined && !Array.isArray(patch.allergies)) {
    errors.allergies = ['This field must be a list.'];
  }
  if (patch.disliked_foods !== undefined && !Array.isArray(patch.disliked_foods)) {
    errors.disliked_foods = ['This field must be a list.'];
  }
  if (patch.health_conditions !== undefined) {
    if (!Array.isArray(patch.health_conditions)) {
      errors.health_conditions = ['This field must be a list.'];
    } else if (patch.health_conditions.length > HEALTH_CONDITIONS_MAX) {
      errors.health_conditions = [`Select at most ${HEALTH_CONDITIONS_MAX}.`];
    }
  }
  const choices = dietProfilePatchSchema
    .pick({ pace: true, who_cooks: true, meal_rhythm: true, weak_moment: true })
    .safeParse(patch);
  if (!choices.success) {
    for (const issue of choices.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string') errors[field] = ['Invalid choice.'];
    }
  }
  if (
    patch.target_weight_kg !== undefined &&
    patch.target_weight_kg !== null &&
    typeof patch.target_weight_kg !== 'number'
  ) {
    errors.target_weight_kg = ['A valid number is required.'];
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// GET/PUT /users/me/diet-profile/ — bare payloads (Style B, API_REFERENCE.md §5). Framework-level
// errors (401 here) still use Style A per §2's "framework-level errors always use Style A" rule.
registerMock('GET', '/users/me/diet-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }
  return { status: 200, delayMs: 250, body: styleB(getOrCreateProfile(user.id)) };
});

registerMock('PUT', '/users/me/diet-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  const patch = (request.body ?? {}) as DietProfilePatch;
  const validationErrors = validatePatch(patch);
  if (validationErrors) {
    return { status: 400, body: validationErrors };
  }

  const current = getOrCreateProfile(user.id);
  const merged: DietProfile = { ...current, ...patch };
  if (merged.weak_moment === 'late_night_snacks' && current.weak_moment !== 'late_night_snacks') {
    merged.late_night_guard = {
      enabled: true,
      check_in_time: DEFAULT_CHECK_IN_TIME,
      next_check_in_at: null,
      status_line: "Late-night guard is on. I'll check in at 10.",
    };
  }
  merged.onboarding_complete = computeOnboardingComplete(merged);

  if (merged.target_source !== 'manual') {
    const canEstimate = merged.weight_kg !== null && merged.height_cm !== null;
    if (canEstimate) {
      const targets = estimateDailyTargets({
        weightKg: merged.weight_kg as number,
        heightCm: merged.height_cm as number,
        ageYears: ageFromDob(user.date_of_birth),
        gender: user.gender,
        activityLevel: merged.activity_level,
        goalType: merged.goal_type,
      });
      merged.daily_calories = targets.calories;
      merged.daily_protein_g = targets.proteinG;
      merged.daily_carbs_g = targets.carbsG;
      merged.daily_fat_g = targets.fatG;
    }
  }

  mockDb.dietProfiles[user.id] = merged;
  return { status: 200, delayMs: 300, body: styleB(merged) };
});
