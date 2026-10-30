import type { DietProfile } from '@/shared/types/dietProfile';

export type ProfileCompletion = {
  core: boolean;
  dietQuick: boolean;
  mealPlanReady: boolean;
  sharpened: boolean;
};

export type TargetQuality = 'unavailable' | 'starter' | 'estimated' | 'confirmed';

export type ProfileCompletionSection =
  | 'goal'
  | 'body'
  | 'dietType'
  | 'activity'
  | 'allergies'
  | 'target'
  | 'cuisine'
  | 'cooking'
  | 'mealRhythm'
  | 'budget'
  | 'health'
  | 'weakMoment';

export type ProfileSectionVisitFlags = Record<string, boolean>;

export type ProfileChecklistItem = {
  id: ProfileCompletionSection;
  label: string;
  done: boolean;
};

export function profileCompletion(profile: DietProfile): ProfileCompletion {
  const core = Boolean(
    profile.goal_type && profile.weight_kg !== null && profile.height_cm !== null,
  );
  const dietQuick = Boolean(profile.diet_type && profile.activity_level);
  const mealPlanReady = Boolean(dietQuick && profile.cuisine_preference);
  const sharpened = Boolean(
    mealPlanReady &&
    profile.who_cooks &&
    profile.meal_rhythm &&
    profile.budget_tier &&
    profile.health_conditions.length > 0,
  );

  return { core, dietQuick, mealPlanReady, sharpened };
}

export function targetQuality(profile: DietProfile): TargetQuality {
  if (profile.weight_kg === null || profile.height_cm === null) return 'unavailable';
  if (!profile.diet_type || !profile.activity_level) return 'starter';
  if (!profile.cuisine_preference) return 'estimated';
  return 'confirmed';
}

export function profileChecklist(
  profile: DietProfile,
  visits: ProfileSectionVisitFlags = {},
): ProfileChecklistItem[] {
  return [
    { id: 'goal', label: 'Goal', done: profile.goal_type !== null },
    {
      id: 'body',
      label: 'Body details',
      done: profile.weight_kg !== null && profile.height_cm !== null,
    },
    { id: 'dietType', label: 'Diet type', done: profile.diet_type !== null },
    { id: 'activity', label: 'Activity', done: profile.activity_level !== null },
    { id: 'allergies', label: 'Foods to avoid', done: Boolean(visits.allergies) },
    {
      id: 'target',
      label: 'Target weight and pace',
      done: profile.target_weight_kg !== null && profile.pace != null,
    },
    { id: 'cuisine', label: 'Cuisine', done: profile.cuisine_preference !== null },
    { id: 'cooking', label: 'Who cooks', done: profile.who_cooks != null },
    { id: 'mealRhythm', label: 'Meal rhythm', done: profile.meal_rhythm != null },
    { id: 'budget', label: 'Budget', done: profile.budget_tier !== null },
    { id: 'health', label: 'Health considerations', done: profile.health_conditions.length > 0 },
    { id: 'weakMoment', label: 'Weak moment', done: profile.weak_moment != null },
  ];
}

export function profileChecklistProgress(items: ProfileChecklistItem[]): {
  done: number;
  total: number;
  ratio: number;
} {
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
