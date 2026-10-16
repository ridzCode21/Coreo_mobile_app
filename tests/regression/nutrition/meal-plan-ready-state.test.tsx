/**
 * Issue #31 — design screen 28c "Today's plan · ready" (design-spec.md lines 134-236, design lines
 * 3284-3344). Protects: exact title copy, the "Left today" card reusing `MacroSummaryCard` without
 * the "Adjusts as I learn you" hint (plan.md Decision #9), the Breakfast/Lunch/Snack/Dinner display
 * order (Decision #10 — NOT the `MEAL_ORDER` constant from lib/macros.ts, which is
 * breakfast/lunch/dinner/snack), the done/next-up/future row treatment, that no meal ever shows a
 * time, the API-driven quick chips (Decision #6), "See full plan" routing to the relocated detail
 * screen (Decision #7), and the round regenerate icon opening the existing `RegenerateSheet`
 * (Decision #8).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import MealPlanScreen from '@/features/nutrition/screens/MealPlanScreen';
import type { MealPlanDetail, PlannedMeal } from '@/shared/types/mealPlan';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: {
      daily_calories: 2000,
      daily_protein_g: 150,
      daily_carbs_g: 220,
      daily_fat_g: 60,
    },
  }),
  useUpdateDietProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-16',
  useFoodEntriesQuery: () => ({
    data: {
      entries: [],
      macro_summary: {
        calories: { consumed: 760, target: 2000, remaining: 1240, over: false },
        protein_g: { consumed: 88, target: 150, remaining: 62, over: false },
        carbs_g: { consumed: 72, target: 220, remaining: 148, over: false },
        fat_g: { consumed: 19, target: 60, remaining: 41, over: false },
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/nutrition/components/RegenerateSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RegenerateSheet: ({ visible }: { visible: boolean }) =>
      visible ? <Text testID="regenerate-sheet-stub">regenerate-sheet-open</Text> : null,
  };
});

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 1,
    date: '2026-10-16',
    meal_type: 'breakfast',
    name: 'Greek yogurt, berries',
    calories_kcal: 300,
    protein_g: 20,
    carbs_g: 30,
    fat_g: 8,
    rationale: '',
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: null,
    constraint_violation: false,
    status: 'planned',
    serving_size: '1 bowl',
    portion_multiplier: 1,
    base_calories_kcal: 300,
    base_protein_g: 20,
    base_carbs_g: 30,
    base_fat_g: 8,
    ingredients_json: [],
    prep_time_minutes: 10,
    estimated_cost_tier: 'moderate',
    confidence_note: '',
    ...overrides,
  };
}

const mockPlan: MealPlanDetail = {
  id: 1,
  status: 'ready',
  failure_reason: '',
  date_start: '2026-10-16',
  date_end: '2026-10-16',
  total_calories: 1640,
  total_protein_g: 104,
  total_carbs_g: 180,
  total_fat_g: 48,
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
    // Deliberately out of display order (dinner before lunch/snack) to prove the screen does not
    // just render `plan.meals` or `MEAL_ORDER` (breakfast/lunch/dinner/snack) verbatim.
    meal({
      id: 4,
      meal_type: 'dinner',
      name: 'Grilled fish, roti, sabzi',
      calories_kcal: 520,
      status: 'planned',
    }),
    meal({
      id: 1,
      meal_type: 'breakfast',
      name: 'Greek yogurt, berries',
      calories_kcal: 300,
      status: 'logged_as_planned',
    }),
    meal({
      id: 2,
      meal_type: 'lunch',
      name: 'Rice bowl, paneer, greens',
      calories_kcal: 640,
      status: 'planned',
    }),
    meal({
      id: 3,
      meal_type: 'snack',
      name: 'Apple, almond butter',
      calories_kcal: 190,
      status: 'planned',
    }),
  ],
};

let mockPromptsData: { options: { id: number; display_text: string }[] } = { options: [] };

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: mockPlan, isLoading: false, isError: false, error: null }),
  useCreateMealPlanMutation: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useRegenerateMealPlanMutation: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useAssistantPromptsQuery: () => ({ data: mockPromptsData }),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockPromptsData = {
    options: [
      { id: 1, display_text: 'Make dinner lighter' },
      { id: 2, display_text: 'Show recipe' },
      { id: 3, display_text: "I'm not hungry" },
    ],
  };
});

describe('MealPlanScreen · 28c ready (issue #31)', () => {
  it('shows the exact title copy', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText('Carbs early, protein steady')).toBeTruthy();
    expect(screen.getByText("— here's the shape of it.")).toBeTruthy();
  });

  it('shows the "Left today" card with remaining macros and no "Adjusts as I learn you" hint', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText('Left today')).toBeTruthy();
    expect(screen.getByText('1,240')).toBeTruthy();
    expect(screen.getByText('62g')).toBeTruthy();
    expect(screen.getByText('148g')).toBeTruthy();
    expect(screen.getByText('41g')).toBeTruthy();
    expect(screen.queryByText('Adjusts as I learn you')).toBeNull();
  });

  it('shows the meals in Breakfast, Lunch, Snack, Dinner order regardless of API array order', () => {
    const { toJSON } = render(<MealPlanScreen />);
    // The serialized tree preserves document order; comparing substring indexes on it is a simple,
    // style-change-resilient way to assert row order without relying on test-renderer internals.
    const serialized = JSON.stringify(toJSON());
    const names = [
      'Greek yogurt, berries',
      'Rice bowl, paneer, greens',
      'Apple, almond butter',
      'Grilled fish, roti, sabzi',
    ];
    const positions = names.map((name) => serialized.indexOf(name));
    expect(positions.every((index) => index !== -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('marks the done meal (breakfast) as dimmed with no calorie number and no time', () => {
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-meal-row-1-done')).toBeTruthy();
    expect(screen.queryByText('7:40')).toBeNull();
    expect(screen.queryByText('300')).toBeNull();
  });

  it('marks the first planned meal (lunch) as "Next up" with its calorie number', () => {
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-meal-row-2-next-up')).toBeTruthy();
    expect(screen.getByText(/Lunch.*Next up/)).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.queryByText('12:30')).toBeNull();
  });

  it('marks remaining planned meals (snack, dinner) as plain future rows', () => {
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-meal-row-3-future')).toBeTruthy();
    expect(screen.getByTestId('plan-meal-row-4-future')).toBeTruthy();
    expect(screen.getByText('190')).toBeTruthy();
    expect(screen.getByText('520')).toBeTruthy();
  });

  it('renders quick chips from the live assistant-prompts query, not hardcoded design text', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText('Make dinner lighter')).toBeTruthy();
    expect(screen.getByText('Show recipe')).toBeTruthy();
    expect(screen.getByText("I'm not hungry")).toBeTruthy();
  });

  it('"See full plan" navigates to the relocated detail screen', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByLabelText('See full plan'));
    expect(mockPush).toHaveBeenCalledWith('/diet/plan/full');
  });

  it('the round regenerate icon opens the existing RegenerateSheet', () => {
    render(<MealPlanScreen />);
    expect(screen.queryByTestId('regenerate-sheet-stub')).toBeNull();
    fireEvent.press(screen.getByLabelText('Regenerate plan'));
    expect(screen.getByTestId('regenerate-sheet-stub')).toBeTruthy();
  });
});
