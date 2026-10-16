/**
 * Issue #31 — `FullMealPlanScreen` is the pre-existing ready-state detail view (day total, full
 * meal list with done/next labels, "Regenerate plan" text pill + `RegenerateSheet`) relocated
 * unchanged from the old `MealPlanScreen.tsx` to a new `/diet/plan/full` route, because 28c's
 * "See full plan" needs a real destination with no design of its own yet (screen 29a is out of
 * scope — plan.md Decision #7). This is a smoke test that the move didn't silently drop behavior
 * already covered in detail by `meal-plan-screen-regenerate-flow.test.tsx` (issue #36) — it does not
 * re-test every regenerate-sheet interaction, only that the screen still renders the same pieces.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import FullMealPlanScreen from '@/features/nutrition/screens/FullMealPlanScreen';
import type { MealPlanDetail } from '@/shared/types/mealPlan';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: { budget_tier: 'moderate', cooking_frequency: 'once_daily' },
  }),
  useUpdateDietProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

const PLAN: MealPlanDetail = {
  id: 1,
  status: 'ready',
  date_start: '2026-10-16',
  date_end: '2026-10-16',
  total_calories: 2000,
  total_protein_g: 150,
  total_carbs_g: 200,
  total_fat_g: 60,
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
    {
      id: 1,
      date: '2026-10-16',
      meal_type: 'breakfast',
      name: 'Masala oats with curd',
      calories_kcal: 400,
      protein_g: 25,
      carbs_g: 50,
      fat_g: 10,
      rationale: '',
      recipe_json: null,
      replaced_at: null,
      replacement_of_id: null,
      constraint_violation: false,
      status: 'planned',
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
    },
  ],
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: PLAN, isLoading: false }),
  useRegenerateMealPlanMutation: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));

describe('FullMealPlanScreen (issue #31, relocated from MealPlanScreen)', () => {
  it('shows the day total card', () => {
    render(<FullMealPlanScreen />);
    expect(screen.getByText('Day total')).toBeTruthy();
  });

  it('shows the full meal list', () => {
    render(<FullMealPlanScreen />);
    expect(screen.getByText('Masala oats with curd')).toBeTruthy();
  });

  it('still opens the regenerate sheet from its own "Regenerate plan" trigger', () => {
    render(<FullMealPlanScreen />);
    fireEvent.press(screen.getByLabelText('Regenerate plan'));
    expect(screen.getByText('Too boring')).toBeTruthy();
  });
});
