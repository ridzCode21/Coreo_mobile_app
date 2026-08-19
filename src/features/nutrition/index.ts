/**
 * Public surface for the nutrition feature — food logging + calorie/macro tracking (Layer 1).
 * Routes and other features import only from here (architecture.md §2). Meal plans, meal actions,
 * and the assistant (Layer 2) will extend this surface when they land.
 */
export { default as DietHomeScreen } from '@/features/nutrition/screens/DietHomeScreen';
export { default as ConfirmMealScreen } from '@/features/nutrition/screens/ConfirmMealScreen';
export { default as BarcodeScannerScreen } from '@/features/nutrition/screens/BarcodeScannerScreen';
export { nutritionKeys, todayISO } from '@/features/nutrition/api/nutritionApi';
