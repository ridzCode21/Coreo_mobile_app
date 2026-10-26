/**
 * Issue #35 — `MealDetailScreen`'s orchestration of the replace flow. The three new sheets
 * (`ReplacePromptSheet`/`ReplaceCompareScreen`/`ReplaceConfirmSheet`) are covered on their own copy
 * and interactions in their sibling test files; this file only proves the screen wires them
 * together correctly — exactly the `meal-detail-portion.test.tsx` precedent for `PortionSheet`.
 *
 * Covers acceptance criteria 1-3 and 7:
 *  1. Confirming a swap uses the backend's returned `meal_id`
 *     (`apps/meals/services/meal_operations.py:283`) to navigate, instead of staying on the old id
 *     and showing "Meal not found" (`MealDetailScreen.tsx:150,159,302-308` pre-fix).
 *  2. Closing Replace and reopening it starts clean (no stale preference/alternatives).
 *  3. A confirm that 404s `preview_not_found` (`apps/meals/views.py:474-480`) returns to the 30a
 *     prompt step with a clear path to retry, rather than leaving the user stuck on a dead sheet.
 *  7. The 35b "replaced" receipt: the "Replaced" badge only needs `replacement_of_id !== null`
 *     (present on every meal, `apps/meals/views.py:777`); the explanatory line and "View the
 *     original" additionally need the `replacedFrom` snapshot carried from the screen that did the
 *     replacing (see plan.md Decision #9 — the backend cannot answer this after the fact).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import MealDetailScreen from '@/features/nutrition/screens/MealDetailScreen';
import type { PlannedMeal } from '@/shared/types/mealPlan';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { id?: string; replacedFrom?: string } = { id: '42' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const DINNER: PlannedMeal = {
  id: 42,
  date: '2026-10-14',
  meal_type: 'dinner',
  name: 'Grilled fish, roti, sabzi',
  calories_kcal: 570,
  protein_g: 40,
  carbs_g: 66,
  fat_g: 14,
  rationale: 'Approx. Balanced dinner for the plan.',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  repair_reason: '',
  constraint_violation: false,
  status: 'planned',
  serving_size: '1 plate',
  portion_multiplier: 1,
  base_calories_kcal: 570,
  base_protein_g: 40,
  base_carbs_g: 66,
  base_fat_g: 14,
  ingredients_json: [{ name: 'Fish', quantity: '150g' }],
  prep_time_minutes: 25,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
};

const REPLACED_DINNER: PlannedMeal = {
  ...DINNER,
  id: 999,
  name: 'Tofu stir-fry, brown rice',
  calories_kcal: 610,
  protein_g: 34,
  carbs_g: 58,
  fat_g: 20,
  replacement_of_id: 42,
};

const ALTERNATIVE = {
  meal_type: 'dinner' as const,
  name: 'Tofu stir-fry, brown rice',
  calories_kcal: 610,
  protein_g: 34,
  carbs_g: 58,
  fat_g: 20,
  rationale: "Approx. Closest match to tonight's macros.",
  serving_size: '1 plate',
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate' as const,
  ingredients: [{ item: 'Tofu', quantity: '150g' }],
  nutrition_source: 'food_records' as const,
  nutrition_trace: [],
};

let mockPlanMeals: PlannedMeal[] = [DINNER];
const mockPreviewMutate = jest.fn();
const mockPreviewReset = jest.fn();
const mockConfirmMutate = jest.fn();
const mockConfirmReset = jest.fn();

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: { meals: mockPlanMeals }, isLoading: false }),
  useMealRecipeQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useLogPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSkipPlannedMealMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAdjustMealQuantityMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useMealFeedbackMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useReplacePreviewMutation: () => ({
    mutate: mockPreviewMutate,
    isPending: false,
    data: { alternatives: [ALTERNATIVE], preview_token: 'tok-1', rejected_count: 0 },
    error: null,
    reset: mockPreviewReset,
  }),
  useReplaceConfirmMutation: () => ({
    mutate: mockConfirmMutate,
    isPending: false,
    error: null,
    reset: mockConfirmReset,
  }),
  useAteSomethingElseMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

// The three new sheets get their own full coverage elsewhere — these stubs only expose the props
// this screen is responsible for wiring, same precedent as the PortionSheet stub in
// meal-detail-portion.test.tsx.
jest.mock('@/features/nutrition/components/ReplacePromptSheet', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReplacePromptSheet: (props: {
      visible: boolean;
      preference: string;
      onPick: (index: number) => void;
      onClose: () => void;
    }) => {
      if (!props.visible) return null;
      return (
        <>
          <Text testID="prompt-preference">{props.preference}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="stub-pick-0"
            onPress={() => props.onPick(0)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="stub-close"
            onPress={props.onClose}
          />
        </>
      );
    },
  };
});

jest.mock('@/features/nutrition/components/ReplaceCompareScreen', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReplaceCompareScreen: (props: { visible: boolean; onUseThisOne: (index: number) => void }) => {
      if (!props.visible) return null;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="stub-use-0"
          onPress={() => props.onUseThisOne(0)}
        />
      );
    },
  };
});

jest.mock('@/features/nutrition/components/ReplaceConfirmSheet', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReplaceConfirmSheet: (props: { visible: boolean; onConfirm: () => void }) => {
      if (!props.visible) return null;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="stub-confirm"
          onPress={props.onConfirm}
        />
      );
    },
  };
});

function driveToConfirmStep() {
  fireEvent.press(screen.getByRole('button', { name: 'Replace' }));
  fireEvent.press(screen.getByRole('button', { name: 'stub-pick-0' }));
  fireEvent.press(screen.getByRole('button', { name: 'stub-use-0' }));
}

describe('nutrition: MealDetailScreen replace flow wiring (issue #35)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: '42' };
    mockPlanMeals = [DINNER];
  });

  it('bug fix: confirming navigates to the backend’s returned meal_id, never shows "Meal not found"', () => {
    mockConfirmMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ status: 'ok', meal_id: 999 }),
    );
    render(<MealDetailScreen />);

    driveToConfirmStep();
    fireEvent.press(screen.getByRole('button', { name: 'stub-confirm' }));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [target] = mockReplace.mock.calls[0];
    expect(String(target)).toContain('/diet/meal/999');
    expect(screen.queryByText('Meal not found')).toBeNull();
  });

  it('confirms with the previewed token and the chosen index', () => {
    mockConfirmMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ status: 'ok', meal_id: 999 }),
    );
    render(<MealDetailScreen />);

    driveToConfirmStep();
    fireEvent.press(screen.getByRole('button', { name: 'stub-confirm' }));

    expect(mockConfirmMutate).toHaveBeenCalledWith(
      { mealId: 42, preview_token: 'tok-1', chosen_index: 0 },
      expect.anything(),
    );
  });

  it('reopening Replace after closing starts clean (no stale preference)', () => {
    render(<MealDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByTestId('prompt-preference').props.children).toBe('');

    fireEvent.press(screen.getByRole('button', { name: 'stub-close' }));
    expect(screen.queryByTestId('prompt-preference')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByTestId('prompt-preference').props.children).toBe('');
  });

  it('a preview_not_found (404) on confirm returns to the prompt step instead of a dead sheet', () => {
    mockConfirmMutate.mockImplementation((_values, handlers) => {
      const { ApiError } =
        jest.requireActual<typeof import('@/shared/api/errors')>('@/shared/api/errors');
      handlers.onError(new ApiError('gone', 'unknown', 404, { error: 'preview_not_found' }));
    });
    render(<MealDetailScreen />);

    driveToConfirmStep();
    fireEvent.press(screen.getByRole('button', { name: 'stub-confirm' }));

    expect(screen.queryByRole('button', { name: 'stub-confirm' })).toBeNull();
    expect(screen.getByRole('button', { name: 'stub-pick-0' })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  describe('35b replaced receipt', () => {
    it('shows the "Replaced" badge whenever the loaded meal has a replacement_of_id', () => {
      mockParams = { id: '999' };
      mockPlanMeals = [REPLACED_DINNER];
      render(<MealDetailScreen />);

      expect(screen.getByText('Replaced')).toBeTruthy();
    });

    it('shows the explanatory line and "View the original" when a replacedFrom snapshot is present', () => {
      mockParams = {
        id: '999',
        replacedFrom: JSON.stringify({
          name: 'Grilled fish, roti, sabzi',
          calories_kcal: 570,
          protein_g: 40,
          carbs_g: 66,
          fat_g: 14,
        }),
      };
      mockPlanMeals = [REPLACED_DINNER];
      render(<MealDetailScreen />);

      expect(
        screen.getByText(/Replaced.*Grilled fish, roti, sabzi.*swapped for a closer macro match\./),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'View the original' })).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'View the original' }));
      expect(screen.getAllByText('Grilled fish, roti, sabzi').length).toBeGreaterThan(0);
    });

    it('omits the explanatory line and the link when there is no replacedFrom snapshot', () => {
      mockParams = { id: '999' };
      mockPlanMeals = [REPLACED_DINNER];
      render(<MealDetailScreen />);

      expect(screen.getByText('Replaced')).toBeTruthy();
      expect(screen.queryByText(/swapped for a closer macro match/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'View the original' })).toBeNull();
    });
  });
});
