/**
 * Issue #32 — 29b "Meal detail" (design-spec.md line 101: "Lunch · 12:30") shows the same
 * scheduled-time suffix in the header eyebrow as the full-plan row. `scheduled_time` is nullable
 * per meal (`apps/meals/models.py:124`, serialized in `apps/meals/views.py:808`), so a meal with
 * no stored time falls back to the bare meal-type label.
 */
import { render, screen } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import type { PlannedMeal } from '@/shared/types/mealPlan';

let mockScheduledTime: string | null = '12:30';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

const mockMeal: PlannedMeal = {
  id: 42,
  date: '2026-10-16',
  meal_type: 'lunch',
  name: 'Rice bowl with paneer and greens',
  calories_kcal: 640,
  protein_g: 32,
  carbs_g: 74,
  fat_g: 22,
  rationale: '',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  repair_reason: '',
  constraint_violation: false,
  status: 'planned',
  serving_size: '1 serving',
  portion_multiplier: 1,
  base_calories_kcal: 640,
  base_protein_g: 32,
  base_carbs_g: 74,
  base_fat_g: 22,
  ingredients_json: [],
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
  get scheduled_time() {
    return mockScheduledTime;
  },
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: { meals: [mockMeal] }, isLoading: false, isError: false }),
  useMealRecipeQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useLogPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAdjustMealQuantityMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useMealFeedbackMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useReplacePreviewMutation: () => ({
    mutate: jest.fn(),
    reset: jest.fn(),
    isPending: false,
    data: undefined,
    error: null,
  }),
  useReplaceConfirmMutation: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
}));

describe('MealDetailScreen scheduled_time (issue #32)', () => {
  it('shows "Lunch · 12:30" in the header eyebrow when scheduled_time is set', () => {
    mockScheduledTime = '12:30';
    render(<MealDetailScreen />);
    expect(screen.getByText('Lunch · 12:30')).toBeTruthy();
  });

  it('falls back to the bare meal label when scheduled_time is null', () => {
    mockScheduledTime = null;
    render(<MealDetailScreen />);
    expect(screen.getByText('Lunch')).toBeTruthy();
    expect(screen.queryByText(/Lunch ·/)).toBeNull();
  });
});
