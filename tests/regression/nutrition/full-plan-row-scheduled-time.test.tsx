/**
 * Issue #32 — 29a "Full plan" (design-spec.md lines 7-8: "Lunch · 12:30" / "Rice bowl, paneer,
 * greens") shows a scheduled time next to the meal label when the backend provides one
 * (`PlannedMeal.scheduled_time`, `apps/meals/models.py:124`, serialized in
 * `apps/meals/views.py:808`). The field is nullable per meal, so a row with no stored time must
 * fall back to the bare meal label, matching the other rows in the same design frame
 * ("Breakfast", "Snack", "Dinner" — design-spec.md lines 4, 10, 13 — carry no time suffix).
 */
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import FullMealPlanScreen from '@/features/nutrition/screens/FullMealPlanScreen';
import type { MealPlanDetail, PlannedMeal } from '@/shared/types/mealPlan';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

const BASE_MEAL: PlannedMeal = {
  id: 1,
  date: '2026-10-16',
  meal_type: 'breakfast',
  name: 'Greek yogurt, berries',
  calories_kcal: 400,
  protein_g: 25,
  carbs_g: 50,
  fat_g: 10,
  rationale: '',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  constraint_violation: false,
  status: 'logged_as_planned',
  serving_size: '1 bowl',
  portion_multiplier: 1,
  base_calories_kcal: 400,
  base_protein_g: 25,
  base_carbs_g: 50,
  base_fat_g: 10,
  ingredients_json: [],
  prep_time_minutes: 15,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
};

const mockPlan: MealPlanDetail = {
  id: 1,
  status: 'ready',
  failure_reason: '',
  date_start: '2026-10-16',
  date_end: '2026-10-16',
  total_calories: 1890,
  total_protein_g: 98,
  total_carbs_g: 212,
  total_fat_g: 58,
  validation_result: {
    self_check_status: 'ok',
    macro_ok: true,
    violation_count: 0,
    self_check_issues: [],
  },
  self_check_status: 'ok',
  plan_mode: 'standard',
  historical_fallback_reason: '',
  meals: [
    BASE_MEAL,
    {
      ...BASE_MEAL,
      id: 2,
      meal_type: 'lunch',
      name: 'Rice bowl, paneer, greens',
      status: 'planned',
      scheduled_time: '12:30',
    },
    { ...BASE_MEAL, id: 3, meal_type: 'snack', name: 'Apple', status: 'skipped' },
  ],
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: mockPlan, isLoading: false, isError: false }),
}));

describe('FullMealPlanScreen scheduled_time (issue #32)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the formatted time next to the meal label when scheduled_time is set', () => {
    render(<FullMealPlanScreen />);
    expect(
      within(screen.getByLabelText('Lunch Rice bowl, paneer, greens')).getByText('Lunch · 12:30'),
    ).toBeTruthy();
  });

  it('falls back to the bare meal label when scheduled_time is absent', () => {
    render(<FullMealPlanScreen />);
    expect(
      within(screen.getByLabelText('Breakfast Greek yogurt, berries')).getByText('Breakfast'),
    ).toBeTruthy();
    expect(within(screen.getByLabelText('Snack Apple')).getByText('Snack')).toBeTruthy();
  });

  it('tapping the row still navigates by meal id, independent of the time label', () => {
    render(<FullMealPlanScreen />);
    fireEvent.press(screen.getByLabelText('Lunch Rice bowl, paneer, greens'));
    expect(mockPush).toHaveBeenCalledWith('/diet/meal/2');
  });
});
