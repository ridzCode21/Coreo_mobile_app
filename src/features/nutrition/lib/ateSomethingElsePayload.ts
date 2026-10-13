import type { MealType } from '@/shared/types/food';
import type { AteSomethingElseRequest } from '@/shared/types/mealPlan';

type MealReference = {
  id: number;
  meal_type: MealType;
};

export function buildAteSomethingElsePayload(
  meal: MealReference,
  description: string,
  approxCalories: number,
): AteSomethingElseRequest {
  return {
    meal_type: meal.meal_type,
    planned_meal_id: meal.id,
    description: description.trim(),
    approx_calories: approxCalories,
  };
}
