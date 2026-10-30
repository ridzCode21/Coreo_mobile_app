/**
 * Issue #30 — adds a "target" checklist item (12a·3: `target_weight_kg` + `pace`) and a
 * "weakMoment" checklist item (12a·6: `weak_moment`) to the signed-in Diet personalization
 * checklist, so `DietPersonalizationCard`'s existing "Improve recommendations" flow can reach
 * these two previously-unreachable design questions without a new navigation surface.
 */

import { profileChecklist, profileCompletion } from '@/features/onboarding/lib/profileCompletion';
import type { DietProfile } from '@/shared/types/dietProfile';

const BASE_PROFILE: DietProfile = {
  onboarding_complete: true,
  goal_type: 'lose_weight',
  weight_kg: 78,
  target_weight_kg: null,
  height_cm: 170,
  activity_level: 'moderate',
  diet_type: 'vegetarian',
  allergies: [],
  disliked_foods: [],
  cuisine_preference: 'indian',
  cooking_time_max: 30,
  meal_frequency: 3,
  budget_tier: 'moderate',
  eating_pattern: null,
  cooking_frequency: null,
  who_cooks: 'i_cook',
  meal_rhythm: 'three_meals',
  pace: null,
  weak_moment: null,
  health_conditions: ['none'],
  target_source: 'calculated',
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 60,
  late_night_guard: {
    enabled: false,
    check_in_time: '22:00',
    next_check_in_at: null,
    status_line: '',
  },
};

function findItem(profile: DietProfile, id: string) {
  const item = profileChecklist(profile).find((entry) => entry.id === id);
  if (!item) throw new Error(`No checklist item with id "${id}"`);
  return item;
}

describe('onboarding: profileChecklist tracks target weight/pace and weak moment (issue #30)', () => {
  it('marks the profile sharpened from who_cooks and meal_rhythm, not retired frequency fields', () => {
    expect(profileCompletion(BASE_PROFILE).sharpened).toBe(true);
  });

  it('"target" is not done when target_weight_kg and pace are both unset', () => {
    expect(findItem(BASE_PROFILE, 'target').done).toBe(false);
  });

  it('"target" is not done when only target_weight_kg is set', () => {
    const profile: DietProfile = { ...BASE_PROFILE, target_weight_kg: 72 };
    expect(findItem(profile, 'target').done).toBe(false);
  });

  it('"target" is not done when only pace is set', () => {
    const profile: DietProfile = { ...BASE_PROFILE, pace: 'steady' };
    expect(findItem(profile, 'target').done).toBe(false);
  });

  it('"target" is done once both target_weight_kg and pace are set', () => {
    const profile: DietProfile = { ...BASE_PROFILE, target_weight_kg: 72, pace: 'steady' };
    expect(findItem(profile, 'target').done).toBe(true);
  });

  it('"weakMoment" is not done when weak_moment is unset', () => {
    expect(findItem(BASE_PROFILE, 'weakMoment').done).toBe(false);
  });

  it('"weakMoment" is done once weak_moment is set', () => {
    const profile: DietProfile = { ...BASE_PROFILE, weak_moment: 'sugar' };
    expect(findItem(profile, 'weakMoment').done).toBe(true);
  });

  it('includes exactly one "target" and one "weakMoment" item in the checklist', () => {
    const ids = profileChecklist(BASE_PROFILE).map((item) => item.id);
    expect(ids.filter((id) => id === 'target')).toHaveLength(1);
    expect(ids.filter((id) => id === 'weakMoment')).toHaveLength(1);
  });
});
