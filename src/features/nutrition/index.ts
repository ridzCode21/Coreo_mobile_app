/**
 * Public surface for the nutrition feature — food logging + calorie/macro tracking (Layer 1)
 * plus meal planning, meal actions, and assistant prompts (Layer 2).
 */
export { default as DietHomeScreen } from '@/features/nutrition/screens/DietHomeScreen';
export { default as ConfirmMealScreen } from '@/features/nutrition/screens/ConfirmMealScreen';
export { default as BarcodeScannerScreen } from '@/features/nutrition/screens/BarcodeScannerScreen';
export { default as MealPlanScreen } from '@/features/nutrition/screens/MealPlanScreen';
export { default as MealDetailScreen } from '@/features/nutrition/screens/MealDetailScreen';
export {
  nutritionKeys,
  todayISO,
  useDailySummaryQuery,
  useUpdateWaterMutation,
} from '@/features/nutrition/api/nutritionApi';
export { mealPlanKeys, useMealPlanQuery } from '@/features/nutrition/api/mealPlanApi';
export { targetsFromProfile } from '@/features/nutrition/lib/macros';
