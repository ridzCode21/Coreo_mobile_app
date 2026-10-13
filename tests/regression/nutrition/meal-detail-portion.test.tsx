/**
 * Issue #33 — two regressions in `MealDetailScreen.tsx` beyond the sheet's own copy/slider (see
 * `portion-sheet.test.tsx` and `portion-slider.test.tsx`):
 *   1. "The value always starts at 1 (`:96`) instead of the meal's `portion_multiplier`" — opening
 *      the sheet on a meal that was already adjusted must start from that meal's own multiplier,
 *      not reset it to 1.
 *   2. "The success message ... is wrong because adjust-quantity only rescales the meal" (it said
 *      'Portion updated and logged.' — `:137,146` pre-fix) — the backend's adjust-quantity response
 *      is `{"status": "ok", ...}` (`apps/meals/services/meal_operations.py:144-150`), it never logs
 *      the meal, so the confirmation copy must not claim that.
 * `PortionSheet` itself is stubbed out (its own copy/slider/estimate behaviour is covered by
 * `portion-sheet.test.tsx`) so this file only has to prove the screen wires the right props and
 * copy to it — not re-render the real slider/gesture machinery.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import type { PlannedMeal } from '@/shared/types/mealPlan';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: '42' }),
}));

const mockAdjustMutate = jest.fn();

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: { meals: [MEAL] }, isLoading: false }),
  useMealRecipeQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useLogPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAdjustMealQuantityMutation: () => ({ mutate: mockAdjustMutate, isPending: false }),
  useMealFeedbackMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useReplacePreviewMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
    data: undefined,
    error: null,
  }),
  useReplaceConfirmMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAteSomethingElseMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

// Stand-in for the real sheet (covered on its own in portion-sheet.test.tsx) — just surfaces the
// props the screen is responsible for wiring, so this file stays about the screen, not the sheet.
jest.mock('@/features/nutrition/components/PortionSheet', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PortionSheet: (props: { visible: boolean; multiplier: number; onSubmit: () => void }) => {
      if (!props.visible) return null;
      return (
        <>
          <Text testID="portion-sheet-multiplier">{props.multiplier}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save portion"
            onPress={props.onSubmit}
          />
        </>
      );
    },
  };
});

const MEAL: PlannedMeal = {
  id: 42,
  date: '2026-10-13',
  meal_type: 'lunch',
  name: 'Rice bowl with paneer and greens',
  calories_kcal: 768,
  protein_g: 48,
  carbs_g: 64,
  fat_g: 16,
  rationale: 'Closest match to your macros.',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  constraint_violation: false,
  status: 'planned',
  serving_size: '1 serving',
  portion_multiplier: 1.6, // already adjusted once — must NOT reset to 1 when reopened
  base_calories_kcal: 480,
  base_protein_g: 30,
  base_carbs_g: 40,
  base_fat_g: 10,
  ingredients_json: [{ name: 'Basmati rice', quantity: '1 cup' }],
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
};

describe('nutrition: MealDetailScreen portion sheet wiring (issue #33)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the portion sheet starting from the meal's own portion_multiplier, not 1", () => {
    render(<MealDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Portion' }));

    expect(screen.getByTestId('portion-sheet-multiplier').props.children).toBe(1.6);
  });

  it('shows a success message that does not say the meal was logged', () => {
    mockAdjustMutate.mockImplementation((_values, handlers) => handlers.onSuccess());
    render(<MealDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Portion' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save portion' }));

    expect(mockAdjustMutate).toHaveBeenCalledWith(
      { mealId: 42, portion_multiplier: 1.6 },
      expect.anything(),
    );
    const notice = screen.getByText(/portion updated/i);
    expect(notice.props.children).not.toMatch(/logged/i);
  });
});
