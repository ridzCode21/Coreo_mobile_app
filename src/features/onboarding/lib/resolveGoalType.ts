import type { GoalType, HealthCondition } from '@/shared/types/dietProfile';

/**
 * Fallback-only `goal_type` derivation — v2 asks `goal_type` directly as a required question (the
 * `goal` step in `dietQuestions.ts`), so this should be unreachable in normal use
 * (onboarding-v2-flow-plan.md §5: "retire the lossy heuristic... keep it only as a fallback if
 * goal is somehow unset"). Kept as a defensive last resort for `SaveScreen`'s final commit, e.g. a
 * resumed draft from an older persisted shape. Priority: a real health condition (D9, not
 * "none"/"prefer_not_to_say") → manage_condition; otherwise → maintain.
 */
export function resolveGoalType(healthConditions: HealthCondition[] = []): GoalType {
  const hasRealCondition = healthConditions.some(
    (condition) => condition !== 'none' && condition !== 'prefer_not_to_say',
  );
  return hasRealCondition ? 'manage_condition' : 'maintain';
}
