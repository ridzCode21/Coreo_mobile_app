import { fireEvent, render, screen } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import { ApiError } from '@/shared/api/errors';
import type { PlannedMeal, RecipeJson } from '@/shared/types/mealPlan';

const mockUseRecipeQuery = jest.fn();
let mockRecipeError: unknown = null;
let mockPregenerated = false;

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
  rationale: 'A rationale that the design does not show.',
  get recipe_json() {
    return mockPregenerated ? mockRecipe : null;
  },
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
  ingredients_json: [{ name: 'Basmati rice', quantity: '1 cup' }],
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
};

const mockRecipe: RecipeJson = {
  name: 'Rice bowl',
  servings: '1 serving',
  steps: [
    { step: 1, instruction: 'Cook the rice.' },
    { step: 2, instruction: 'Fold in the paneer.' },
  ],
  ingredients: [],
  prep_time_minutes: 20,
  cook_time_minutes: 15,
  nutrition_note: 'Serve warm.',
  checked_nutrition: {
    calories_kcal: 640,
    protein_g: 32,
    carbs_g: 74,
    fat_g: 22,
    source: 'food_records',
    trace: [],
  },
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: { meals: [mockMeal] }, isLoading: false, isError: false }),
  useMealRecipeQuery: (date: string, mealId: number, enabled: boolean) => {
    mockUseRecipeQuery(date, mealId, enabled);
    return {
      data: enabled && !mockRecipeError ? mockRecipe : undefined,
      isLoading: false,
      error: enabled ? mockRecipeError : null,
    };
  },
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

describe('MealDetailScreen recipe teaser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecipeError = null;
    mockPregenerated = false;
  });

  it('does not enable the recipe request until View recipe is pressed', () => {
    render(<MealDetailScreen />);
    expect(mockUseRecipeQuery).toHaveBeenLastCalledWith(expect.any(String), 42, false);
    expect(screen.getByText('Recipe ready in a few short steps.')).toBeTruthy();
    expect(screen.queryByText('Cook the rice.')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'View recipe' }));

    expect(mockUseRecipeQuery).toHaveBeenLastCalledWith(expect.any(String), 42, true);
    expect(screen.getByText('Cook the rice.')).toBeTruthy();
  });

  it('shows the fixed refusal state without replacing meal content', () => {
    mockRecipeError = new ApiError('Validation error', 'validation', 422, {
      error: 'recipe_check_failed',
      message: 'Backend detail',
    });
    render(<MealDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'View recipe' }));

    expect(screen.getByText("I couldn't write this one honestly.")).toBeTruthy();
    expect(
      screen.getByText(
        "The steps didn't match the meal as planned. Nothing logged, nothing lost — the meal above is unchanged.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(mockMeal.name)).toBeTruthy();
  });

  it('still gates a pre-generated recipe behind View recipe', () => {
    mockPregenerated = true;
    render(<MealDetailScreen />);
    expect(mockUseRecipeQuery).toHaveBeenLastCalledWith(expect.any(String), 42, false);
    expect(screen.queryByText('Cook the rice.')).toBeNull();
    expect(screen.getByRole('button', { name: 'View recipe' })).toBeTruthy();
  });
});
