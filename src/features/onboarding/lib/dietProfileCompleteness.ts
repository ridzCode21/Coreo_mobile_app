import type { DietProfile } from '@/shared/types/dietProfile';

/** The subset of `DietProfile` this completeness score actually reads — narrow enough that a
 * client-only `DietProfileDraft` (which mirrors these exact fields/types, see
 * `features/onboarding/store/onboardingStore.ts`) satisfies it too. v2 computes this from the
 * local draft pre-signup (onboarding-v2-flow-plan.md §2), not from a `GET`, so the calibrating
 * screen never needs a live profile object at all. */
export type CompletenessSource = Pick<
  DietProfile,
  | 'goal_type'
  | 'diet_type'
  | 'allergies'
  | 'disliked_foods'
  | 'cuisine_preference'
  | 'target_weight_kg'
  | 'activity_level'
  | 'cooking_frequency'
  | 'budget_tier'
  | 'health_conditions'
>;

/** Diet-question step id a given tracked check maps back to — lets the calibrating screen route
 * "continue where you left off" straight to the first unanswered question. */
const CHECKS: {
  done: (profile: CompletenessSource) => boolean;
  label: string;
  questionId: string;
}[] = [
  { done: (p) => p.goal_type !== null, label: 'Goal', questionId: 'goal' },
  { done: (p) => p.diet_type !== null, label: 'Diet type', questionId: 'diet-type' },
  {
    done: (p) => p.allergies.length > 0 || p.disliked_foods.length > 0,
    label: 'Off the table',
    questionId: 'off-the-table',
  },
  { done: (p) => p.cuisine_preference !== null, label: 'Cuisine', questionId: 'cuisine' },
  { done: (p) => p.target_weight_kg !== null, label: 'Target weight', questionId: 'target' },
  { done: (p) => p.activity_level !== null, label: 'Activity', questionId: 'activity' },
  { done: (p) => p.cooking_frequency !== null, label: 'Who cooks', questionId: 'who-cooks' },
  { done: (p) => p.budget_tier !== null, label: 'Budget', questionId: 'budget' },
  { done: (p) => p.health_conditions.length > 0, label: 'Health', questionId: 'health' },
];

export type DietProfileCompletenessDetail = {
  ratio: number;
  /** `null` once everything tracked is answered. */
  nextLabel: string | null;
  nextQuestionId: string | null;
};

/**
 * Decorative 0–1 completeness score (+ "what's next") driving the calibrating screen's wave (Part
 * C, onboarding-refinement-plan.md). Deliberately **not** the same thing as `onboarding_complete`
 * (which stays exactly the API's own goal_type+diet_type+cuisine_preference definition,
 * `computeOnboardingComplete` in shared/types/dietProfile.ts) — this is a softer "how much of the
 * interview have you done" signal for the progress wave.
 *
 * `meal_frequency` (D7/12a·5) is deliberately excluded: the API defaults it to `4` rather than
 * `null`, so an unanswered value is indistinguishable from an answered one purely from GET state —
 * tracking it here would silently overstate completeness before the user ever sees that question.
 * Allergies/disliked_foods share one slot ("off the table", D2) since either can be empty for a
 * genuine "nothing" answer, not just an unanswered one — a known, accepted approximation for what
 * is a decorative percentage, not a gating value.
 */
export function dietProfileCompletenessDetail(
  profile: CompletenessSource,
): DietProfileCompletenessDetail {
  const results = CHECKS.map((check) => check.done(profile));
  const answered = results.filter(Boolean).length;
  const ratio = CHECKS.length === 0 ? 0 : answered / CHECKS.length;
  const nextIndex = results.indexOf(false);
  return {
    ratio,
    nextLabel: nextIndex === -1 ? null : CHECKS[nextIndex].label,
    nextQuestionId: nextIndex === -1 ? null : CHECKS[nextIndex].questionId,
  };
}

export function dietProfileCompleteness(profile: CompletenessSource): number {
  return dietProfileCompletenessDetail(profile).ratio;
}
