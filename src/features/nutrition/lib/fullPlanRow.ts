import type { PlannedMeal } from '@/shared/types/mealPlan';

export type FullPlanRowState = 'adjusted' | 'logged' | 'next' | 'skipped' | 'planned';

export const FULL_PLAN_ROW_LABEL: Record<FullPlanRowState, string> = {
  adjusted: 'Adjusted for you',
  logged: 'Logged',
  next: 'Next',
  skipped: 'Skipped',
  planned: 'Planned',
};

export function fullPlanRowState(meal: PlannedMeal, nextMealId: number | null): FullPlanRowState {
  if (meal.replacement_of_id !== null) return 'adjusted';
  if (
    meal.status === 'logged_as_planned' ||
    meal.status === 'logged_modified' ||
    meal.status === 'eaten_outside'
  ) {
    return 'logged';
  }
  if (meal.status === 'skipped' || meal.status === 'missed') return 'skipped';
  if (meal.status === 'planned' && meal.id === nextMealId) return 'next';
  return 'planned';
}
