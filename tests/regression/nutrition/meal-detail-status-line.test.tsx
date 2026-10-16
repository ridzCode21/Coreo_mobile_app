import { fireEvent, render, screen } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import type { PlannedMeal } from '@/shared/types/mealPlan';

const mockAdjustMutate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

const mockMeal: PlannedMeal = {
  id: 42,
  date: '2026-10-16',
  meal_type: 'lunch',
  name: 'Rice bowl',
  calories_kcal: 640,
  protein_g: 32,
  carbs_g: 74,
  fat_g: 22,
  rationale: '',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  constraint_violation: false,
  status: 'logged_as_planned',
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
};

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: { meals: [mockMeal] }, isLoading: false, isError: false }),
  useMealRecipeQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useLogPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAdjustMealQuantityMutation: () => ({ mutate: mockAdjustMutate, isPending: false }),
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

jest.mock('@/features/nutrition/components/PortionSheet', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PortionSheet: ({ visible, onSubmit }: { visible: boolean; onSubmit: () => void }) =>
      visible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save portion"
          onPress={onSubmit}
        />
      ) : null,
  };
});

describe('MealDetailScreen status copy', () => {
  it('removes the static capitalized status line and retains transient action confirmation', () => {
    mockAdjustMutate.mockImplementation((_values, handlers) => handlers.onSuccess());
    render(<MealDetailScreen />);
    expect(screen.queryByText(/logged as planned/i)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Adjust' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save portion' }));
    expect(screen.getByText("Portion updated. Today's macros reflect it.")).toBeTruthy();
  });
});
