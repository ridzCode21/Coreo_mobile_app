import { fireEvent, render, screen, within } from '@testing-library/react-native';

import FullMealPlanScreen from '@/features/nutrition/screens/FullMealPlanScreen';
import { fontFamily } from '@/shared/theme/tokens';
import type { MealPlanDetail, PlannedMeal } from '@/shared/types/mealPlan';

const mockPush = jest.fn();
let mockMacroOk: boolean | null = true;

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
  date_start: '2026-10-16',
  date_end: '2026-10-16',
  total_calories: 1890,
  total_protein_g: 98,
  total_carbs_g: 212,
  total_fat_g: 58,
  validation_result: {
    self_check_status: 'ok',
    get macro_ok() {
      return mockMacroOk;
    },
    violation_count: 0,
    self_check_issues: ['Do not render backend issue copy.'],
  },
  self_check_status: 'ok',
  plan_mode: 'standard',
  historical_fallback_reason: '',
  meals: [
    BASE_MEAL,
    { ...BASE_MEAL, id: 2, meal_type: 'lunch', name: 'Rice bowl', status: 'planned' },
    { ...BASE_MEAL, id: 3, meal_type: 'snack', name: 'Apple', status: 'skipped' },
    { ...BASE_MEAL, id: 4, meal_type: 'dinner', name: 'Fish and roti', status: 'planned' },
    { ...BASE_MEAL, id: 5, meal_type: 'snack', name: 'Late snack', status: 'missed' },
  ],
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: mockPlan, isLoading: false, isError: false }),
}));

describe('FullMealPlanScreen design 29a', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMacroOk = true;
  });

  it.each([true, null])('hides the macro banner when macro_ok is %s', (macroOk) => {
    mockMacroOk = macroOk;
    render(<FullMealPlanScreen />);
    expect(screen.queryByText(/Macros landed a touch off today/)).toBeNull();
  });

  it('shows only the fixed two-sentence banner when macro_ok is false', () => {
    mockMacroOk = false;
    render(<FullMealPlanScreen />);
    expect(
      screen.getByText(
        'Macros landed a touch off today — still within range. Tomorrow adjusts, nothing repeats.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Do not render backend issue copy.')).toBeNull();
  });

  it('renders the four design states without row macro copy', () => {
    render(<FullMealPlanScreen />);
    expect(screen.getByText('Logged')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.getAllByText('Skipped')).toHaveLength(2);
    expect(screen.getByText('Planned')).toBeTruthy();
    expect(screen.getByText('Apple')).toHaveStyle({ textDecorationLine: 'line-through' });
    expect(screen.queryByText(/400 kcal/)).toBeNull();
    expect(screen.queryByText(/25g protein/)).toBeNull();
  });

  it('marks snack as Next before dinner when both are planned', () => {
    const originalMeals = mockPlan.meals;
    mockPlan.meals = [
      BASE_MEAL,
      { ...BASE_MEAL, id: 2, meal_type: 'lunch', name: 'Rice bowl', status: 'logged_as_planned' },
      { ...BASE_MEAL, id: 3, meal_type: 'snack', name: 'Afternoon snack', status: 'planned' },
      { ...BASE_MEAL, id: 4, meal_type: 'dinner', name: 'Fish and roti', status: 'planned' },
    ];

    try {
      render(<FullMealPlanScreen />);
      expect(within(screen.getByLabelText('Snack Afternoon snack')).getByText('Next')).toBeTruthy();
      expect(
        within(screen.getByLabelText('Dinner Fish and roti')).getByText('Planned'),
      ).toBeTruthy();
    } finally {
      mockPlan.meals = originalMeals;
    }
  });

  it('uses the design font weights for meal names and state labels', () => {
    render(<FullMealPlanScreen />);

    expect(screen.getByText('Greek yogurt, berries')).toHaveStyle({
      fontFamily: fontFamily.poppins400,
      fontSize: 13.5,
    });
    expect(screen.getByText('Rice bowl')).toHaveStyle({
      fontFamily: fontFamily.poppins500,
      fontSize: 13.5,
    });
    for (const label of ['Logged', 'Next', 'Planned']) {
      expect(screen.getByText(label)).toHaveStyle({
        fontFamily: fontFamily.poppins500,
        fontSize: 9.5,
        letterSpacing: 0.4,
      });
    }
  });

  it('shows API totals without the old label or regenerate action', () => {
    render(<FullMealPlanScreen />);
    expect(screen.getByText('1,890')).toBeTruthy();
    expect(screen.getByText('98g')).toBeTruthy();
    expect(screen.getByText('212g')).toBeTruthy();
    expect(screen.getByText('58g')).toBeTruthy();
    expect(screen.queryByText('Day total')).toBeNull();
    expect(screen.queryByLabelText('Regenerate plan')).toBeNull();
  });

  it('opens the selected meal', () => {
    render(<FullMealPlanScreen />);
    fireEvent.press(screen.getByLabelText('Lunch Rice bowl'));
    expect(mockPush).toHaveBeenCalledWith('/diet/meal/2');
  });
});
