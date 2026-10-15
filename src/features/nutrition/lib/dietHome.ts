import { MEAL_ORDER } from '@/features/nutrition/lib/macros';
import type { MealType } from '@/shared/types/food';
import type { PlannedMeal } from '@/shared/types/mealPlan';

export const MEAL_WINDOW_COPY: Record<MealType, string> = {
  breakfast: 'this morning',
  lunch: 'before 1 PM',
  dinner: 'this evening',
  snack: 'when you need it',
};

export const MEAL_CLOSER_COPY: Record<MealType, string> = {
  breakfast: 'sets up the day gently.',
  lunch: 'carries you through tonight.',
  dinner: 'rounds out the day.',
  snack: 'keeps the gap comfortable.',
};

export function nextPlannedMeal(meals: PlannedMeal[]): PlannedMeal | null {
  for (const mealType of MEAL_ORDER) {
    const meal = meals.find(
      (candidate) => candidate.meal_type === mealType && candidate.status === 'planned',
    );
    if (meal) return meal;
  }
  return null;
}

export function formatWeightChip(
  weightKg: number | null,
  targetWeightKg: number | null,
): string | null {
  if (weightKg === null || targetWeightKg === null) return null;
  return `${Math.round(weightKg)} → ${Math.round(targetWeightKg)}`;
}
