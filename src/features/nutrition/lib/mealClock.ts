import type { MealType } from '@/shared/types/food';

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function formatMealTime(time: string): string {
  return time.replace(/^0/, '');
}

export function mealTimeLabel(
  mealType: MealType,
  scheduledTime: string | null | undefined,
): string {
  const label = MEAL_LABEL[mealType];
  return scheduledTime ? `${label} · ${formatMealTime(scheduledTime)}` : label;
}

export function currentMealByClock(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}
