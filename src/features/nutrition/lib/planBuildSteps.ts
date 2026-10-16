import type { MealPlanStatus } from '@/shared/types/mealPlan';

export type BuildingStatus = Extract<MealPlanStatus, 'pending' | 'generating' | 'validating'>;

const BUILD_STEP_INDEX: Record<BuildingStatus, number> = {
  pending: 0,
  generating: 1,
  validating: 2,
};

export function buildStepIndex(status: BuildingStatus): number {
  return BUILD_STEP_INDEX[status];
}
