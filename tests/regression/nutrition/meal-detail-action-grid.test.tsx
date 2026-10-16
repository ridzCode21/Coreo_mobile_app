import { fireEvent, render, screen } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import type { PlannedMeal } from '@/shared/types/mealPlan';

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
  rationale: 'Do not show this.',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
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

jest.mock('@/features/nutrition/components/PortionSheet', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PortionSheet: ({ visible }: { visible: boolean }) =>
      visible ? <Text>Adjust open</Text> : null,
  };
});

describe('MealDetailScreen design 29b', () => {
  it('shows the design header, chips, compact hero, and five actions', () => {
    render(<MealDetailScreen />);
    expect(screen.getByText('Lunch')).toBeTruthy();
    expect(screen.getByText('20 min')).toBeTruthy();
    expect(screen.getByText('Moderate cost')).toBeTruthy();
    expect(screen.getByText('1 serving')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByText('P 32g · C 74g · F 22g')).toBeTruthy();
    expect(screen.queryByText('Do not show this.')).toBeNull();
    expect(screen.getByText('Ingredients')).toHaveStyle({ letterSpacing: 1.6 });
    expect(screen.getByText('1 cup')).toHaveStyle({ color: 'rgba(23,25,29,0.5)' });

    const labels = ['Log', 'Skip', 'Adjust', 'Replace', 'Feedback'];
    labels.forEach((label) => expect(screen.getByRole('button', { name: label })).toBeTruthy());
    const actionOrder = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
      .filter((label) => labels.includes(label));
    expect(actionOrder).toEqual(labels);
    expect(screen.queryByRole('button', { name: 'Ate else' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Portion' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Log as planned' })).toBeNull();
  });

  it('opens the existing portion flow from Adjust', () => {
    render(<MealDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Adjust' }));
    expect(screen.getByText('Adjust open')).toBeTruthy();
  });
});
