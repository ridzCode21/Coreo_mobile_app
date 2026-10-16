/**
 * Public surface for the nutrition feature — food logging + calorie/macro tracking (Layer 1)
 * plus meal planning, meal actions, and assistant prompts (Layer 2).
 */
export { default as DietHomeScreen } from '@/features/nutrition/screens/DietHomeScreen';
export { default as ConfirmMealScreen } from '@/features/nutrition/screens/ConfirmMealScreen';
export { default as BarcodeScannerScreen } from '@/features/nutrition/screens/BarcodeScannerScreen';
export { default as MealPlanScreen } from '@/features/nutrition/screens/MealPlanScreen';
export { default as FullMealPlanScreen } from '@/features/nutrition/screens/FullMealPlanScreen';
export { default as MealDetailScreen } from '@/features/nutrition/screens/MealDetailScreen';
export { default as PhotoResultScreen } from '@/features/nutrition/screens/PhotoResultScreen';
export { default as PhotoUnreadableScreen } from '@/features/nutrition/screens/PhotoUnreadableScreen';
export { default as PhotoReceiptScreen } from '@/features/nutrition/screens/PhotoReceiptScreen';
export { default as LabelResultScreen } from '@/features/nutrition/screens/LabelResultScreen';
export { default as LabelUnreadableScreen } from '@/features/nutrition/screens/LabelUnreadableScreen';
export { default as WeekInReviewScreen } from '@/features/nutrition/screens/WeekInReviewScreen';
export {
  nutritionKeys,
  todayISO,
  useDailySummaryQuery,
  useUpdateWaterMutation,
} from '@/features/nutrition/api/nutritionApi';
export { mealPlanKeys, useMealPlanQuery } from '@/features/nutrition/api/mealPlanApi';
export { targetsFromProfile } from '@/features/nutrition/lib/macros';
