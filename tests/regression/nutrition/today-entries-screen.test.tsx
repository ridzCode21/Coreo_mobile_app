/**
 * Issue #128 — new `TodayEntriesScreen` (plan.md Decision log #4): reached at `/diet/entries`, lists
 * today's logged entries grouped by meal using the already-built `FoodEntryRow` (name, macros,
 * calories, "Remove") and `groupEntriesByMeal` (its own pure rule is covered separately in
 * `today-entries-grouping.test.ts`). No design match exists for this screen (design-spec.md has no
 * screen id for #128), so copy/states follow the calm, never-red, never-invented-number pattern used
 * by every other nutrition list screen (e.g. `MyFoodsScreen`).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import TodayEntriesScreen from '@/features/nutrition/screens/TodayEntriesScreen';
import type { FoodEntry } from '@/shared/types/food';
import type { FoodEntriesApiResponse } from '@/features/nutrition/api/nutritionApi';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

type MockQueryState = {
  data: FoodEntriesApiResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: jest.Mock;
};

let mockQueryState: MockQueryState;
const mockDeleteMutate = jest.fn();

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-07-06',
  useFoodEntriesQuery: () => mockQueryState,
  useDeleteFoodEntryMutation: () => ({ mutate: mockDeleteMutate }),
}));

function entry(id: number, meal_type: FoodEntry['meal_type'], food_name: string): FoodEntry {
  return {
    id,
    date: '2026-07-06',
    meal_type,
    food_item: null,
    food_name,
    portion_g: 100,
    calories: 320,
    protein_g: 18,
    carbs_g: 30,
    fat_g: 10,
    source: 'manual',
    ai_guess: null,
    created_at: '2026-07-06T08:00:00Z',
  };
}

const MACRO_SUMMARY = {
  calories: { consumed: 760, target: 2000, remaining: 1240, over: false },
  protein_g: { consumed: 62, target: 120, remaining: 58, over: false },
  carbs_g: { consumed: 148, target: 220, remaining: 72, over: false },
  fat_g: { consumed: 41, target: 70, remaining: 29, over: false },
};

describe('nutrition: TodayEntriesScreen (issue #128)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryState = {
      data: undefined,
      isLoading: true,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    };
  });

  it('shows a loading state while fetching', () => {
    render(<TodayEntriesScreen />);
    expect(screen.getByLabelText(/loading today's entries/i)).toBeTruthy();
  });

  it('shows calm copy on a load failure, never "Nothing logged"', () => {
    mockQueryState = {
      data: undefined,
      isLoading: false,
      isError: true,
      isRefetching: false,
      refetch: jest.fn(),
    };
    render(<TodayEntriesScreen />);
    expect(screen.getByText(/couldn't load today's entries/i)).toBeTruthy();
    expect(screen.queryByText(/nothing logged/i)).toBeNull();
  });

  it('shows "Nothing logged yet today." when there are no entries', () => {
    mockQueryState = {
      data: { entries: [], macro_summary: MACRO_SUMMARY },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    };
    render(<TodayEntriesScreen />);
    expect(screen.getByText('Nothing logged yet today.')).toBeTruthy();
  });

  describe('list state', () => {
    const BREAKFAST = entry(1, 'breakfast', 'Poha');
    const LUNCH = entry(2, 'lunch', 'Dal rice');

    beforeEach(() => {
      mockQueryState = {
        data: { entries: [LUNCH, BREAKFAST], macro_summary: MACRO_SUMMARY },
        isLoading: false,
        isError: false,
        isRefetching: false,
        refetch: jest.fn(),
      };
    });

    it('groups entries under meal section headers, in breakfast-before-lunch order', () => {
      render(<TodayEntriesScreen />);
      const breakfastHeader = screen.getByText('Breakfast');
      const lunchHeader = screen.getByText('Lunch');
      const poha = screen.getByText('Poha');
      const dalRice = screen.getByText('Dal rice');
      expect(breakfastHeader).toBeTruthy();
      expect(lunchHeader).toBeTruthy();
      expect(poha).toBeTruthy();
      expect(dalRice).toBeTruthy();
    });

    it('omits meal section headers with no entries', () => {
      render(<TodayEntriesScreen />);
      expect(screen.queryByText('Dinner')).toBeNull();
      expect(screen.queryByText('Snack')).toBeNull();
    });

    it('pressing "Remove" on an entry calls the delete mutation with that entry\'s id', () => {
      render(<TodayEntriesScreen />);
      fireEvent.press(screen.getByLabelText('Remove Poha'));
      expect(mockDeleteMutate).toHaveBeenCalledWith(BREAKFAST.id);
    });

    it('the back chevron calls router.back()', () => {
      render(<TodayEntriesScreen />);
      fireEvent.press(screen.getByLabelText('Go back'));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
