import type { PlannedMeal } from '@/shared/types/mealPlan';

export function soleRepairedMeal(meals: PlannedMeal[]): PlannedMeal | null {
  const repairedMeals = meals.filter((meal) => meal.repair_reason !== '');
  return repairedMeals.length === 1 ? repairedMeals[0] : null;
}
