import type { PlannedMeal } from '@/shared/types/mealPlan';

export type PortionMacros = Pick<PlannedMeal, 'calories_kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;

export const MIN_PORTION_MULTIPLIER = 0.01;

export function resolvePortionBase(meal: PlannedMeal): PortionMacros {
  return {
    calories_kcal: meal.base_calories_kcal ?? meal.calories_kcal,
    protein_g: meal.base_protein_g ?? meal.protein_g,
    carbs_g: meal.base_carbs_g ?? meal.carbs_g,
    fat_g: meal.base_fat_g ?? meal.fat_g,
  };
}

export function computePortionEstimate(base: PortionMacros, multiplier: number): PortionMacros {
  if (multiplier === 1) return base;

  return {
    calories_kcal: Math.round(base.calories_kcal * multiplier),
    protein_g: Math.round(base.protein_g * multiplier),
    carbs_g: Math.round(base.carbs_g * multiplier),
    fat_g: Math.round(base.fat_g * multiplier),
  };
}

export function formatMultiplier(value: number): string {
  return String(Math.round(value * 100) / 100);
}
