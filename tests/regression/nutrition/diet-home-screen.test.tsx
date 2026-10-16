/**
 * Issue #22 — Diet home (14a) redesign. Pre-fix `DietHomeScreen` (current-behaviour section of the
 * issue): headline "Your fuel, kept honest." instead of "Carbs before 5...." (`:70`), no back
 * chevron/weight chip even though `weight_kg`/`target_weight_kg` exist (`:36-37`,
 * `dietProfile.ts:79-80`), a quality badge instead of "Adjusts as I learn you" (`MacroSummaryCard
 * :66-68`), the full `MealPlanCard` instead of a single "Next meal" line, no reassurance strip or
 * voice bar, no real pull-to-refresh despite the profile-error copy promising one (`:89`, no
 * `RefreshControl` anywhere pre-fix), and a failed entries request silently rendering "Nothing
 * logged yet..." (`:52`, `:96-98`) instead of an error. `NextMealCard`/`ReassuranceStrip` are
 * covered on their own copy in their sibling test files; here they're stubbed to isolate the
 * screen's own wiring (same precedent as `meal-plan-screen-regenerate-flow.test.tsx`).
 */

import { RefreshControl, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';

import DietHomeScreen from '@/features/nutrition/screens/DietHomeScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { FoodEntriesResponse } from '@/features/nutrition/api/nutritionApi';
import { colors, componentSizes } from '@/shared/theme/tokens';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

let mockProfile: Partial<DietProfile> | undefined;
let mockProfileLoading = false;
let mockProfileError = false;
const mockProfileRefetch = jest.fn();
jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: mockProfile,
    isLoading: mockProfileLoading,
    isError: mockProfileError,
    refetch: mockProfileRefetch,
  }),
}));

let mockEntries: Partial<FoodEntriesResponse> | undefined;
let mockEntriesLoading = false;
let mockEntriesError = false;
const mockEntriesRefetch = jest.fn();
let mockUsualsSuggestions: unknown[] = [];
let mockUsualsLoading = false;
let mockUsualsError = false;
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-07-06',
  useFoodEntriesQuery: () => ({
    data: mockEntries,
    isLoading: mockEntriesLoading,
    isError: mockEntriesError,
    refetch: mockEntriesRefetch,
  }),
  useUsualsQuery: () => ({
    data: mockUsualsLoading || mockUsualsError ? undefined : { suggestions: mockUsualsSuggestions },
    isLoading: mockUsualsLoading,
    isError: mockUsualsError,
  }),
}));

jest.mock('@/features/nutrition/components/NextMealCard', () => {
  const { Text } = jest.requireActual('react-native');
  return { NextMealCard: () => <Text testID="next-meal-card-stub">next-meal-stub</Text> };
});

jest.mock('@/features/nutrition/components/ReassuranceStrip', () => {
  const { Text } = jest.requireActual('react-native');
  return { ReassuranceStrip: () => <Text testID="reassurance-strip-stub">reassurance-stub</Text> };
});

jest.mock('@/features/nutrition/components/LogMealSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    LogMealSheet: ({ visible }: { visible: boolean }) =>
      visible ? <Text testID="log-meal-sheet-stub">log-meal-sheet-stub</Text> : null,
  };
});

jest.mock('@/features/nutrition/components/YourUsualsSheet', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    YourUsualsSheet: ({
      visible,
      onSomethingNew,
    }: {
      visible: boolean;
      onSomethingNew: () => void;
    }) =>
      visible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="usuals-something-new"
          onPress={onSomethingNew}
        >
          <Text testID="your-usuals-sheet-stub">your-usuals-sheet-stub</Text>
        </Pressable>
      ) : null,
  };
});

const FULL_PROFILE: Partial<DietProfile> = {
  weight_kg: 78,
  target_weight_kg: 72,
  daily_calories: 2000,
  daily_protein_g: 120,
  daily_carbs_g: 220,
  daily_fat_g: 70,
};

const FULL_ENTRIES: FoodEntriesResponse = {
  entries: [],
  macro_summary: { calories_in: 760, protein_g: 62, carbs_g: 148, fat_g: 41 },
};

describe('nutrition: DietHomeScreen (issue #22)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = FULL_PROFILE;
    mockProfileLoading = false;
    mockProfileError = false;
    mockEntries = FULL_ENTRIES;
    mockEntriesLoading = false;
    mockEntriesError = false;
    mockUsualsSuggestions = [];
    mockUsualsLoading = false;
    mockUsualsError = false;
  });

  it('shows the design\'s two-weight headline, not the old "Your fuel, kept honest." copy', () => {
    render(<DietHomeScreen />);
    expect(screen.getByText('Carbs before 5.')).toBeTruthy();
    expect(screen.getByText("That's the whole game today.")).toBeTruthy();
    expect(screen.queryByText(/kept honest/)).toBeNull();
  });

  it('shows the weight chip "78 → 72" when both weights are present', () => {
    render(<DietHomeScreen />);
    expect(screen.getByText('78 → 72')).toBeTruthy();
  });

  it('hides the weight chip when either weight is missing (never invents a number)', () => {
    mockProfile = { ...FULL_PROFILE, weight_kg: null };
    render(<DietHomeScreen />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it('the back chevron calls router.back()', () => {
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders the Next meal card and the reassurance strip', () => {
    render(<DietHomeScreen />);
    expect(screen.getByTestId('next-meal-card-stub')).toBeTruthy();
    expect(screen.getByTestId('reassurance-strip-stub')).toBeTruthy();
  });

  it('shows the voice bar copy and the "Log a meal" pill', () => {
    render(<DietHomeScreen />);
    expect(screen.getByText('Say what you ate. Five seconds')).toBeTruthy();
    expect(screen.getByLabelText('Log a meal')).toBeTruthy();
  });

  it('opens Your usuals instead of the normal log sheet when suggestions exist', () => {
    mockUsualsSuggestions = [{ food_name: 'Poha' }];
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText('Log a meal'));
    expect(screen.getByTestId('your-usuals-sheet-stub')).toBeTruthy();
    expect(screen.queryByTestId('log-meal-sheet-stub')).toBeNull();
  });

  it('opens the normal log sheet when suggestions are empty', () => {
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText('Log a meal'));
    expect(screen.getByTestId('log-meal-sheet-stub')).toBeTruthy();
    expect(screen.queryByTestId('your-usuals-sheet-stub')).toBeNull();
  });

  it.each(['loading', 'error'] as const)(
    'opens the normal log sheet when usuals are %s',
    (state) => {
      mockUsualsLoading = state === 'loading';
      mockUsualsError = state === 'error';
      render(<DietHomeScreen />);
      fireEvent.press(screen.getByLabelText('Log a meal'));
      expect(screen.getByTestId('log-meal-sheet-stub')).toBeTruthy();
      expect(screen.queryByTestId('your-usuals-sheet-stub')).toBeNull();
    },
  );

  it('switches from Your usuals to the normal log sheet', () => {
    mockUsualsSuggestions = [{ food_name: 'Poha' }];
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText('Log a meal'));
    fireEvent.press(screen.getByLabelText('usuals-something-new'));
    expect(screen.queryByTestId('your-usuals-sheet-stub')).toBeNull();
    expect(screen.getByTestId('log-meal-sheet-stub')).toBeTruthy();
  });

  it("renders the Log a meal pill with the design's separate white outer glow", () => {
    render(<DietHomeScreen />);
    const glow = StyleSheet.flatten(screen.getByTestId('log-pill-glow').props.style);
    expect(glow.shadowColor).toBe(colors.white);
    expect(glow.shadowOffset).toEqual({ width: 0, height: 0 });
    expect(glow.shadowOpacity).toBe(0.7);
    expect(glow.shadowRadius).toBe(componentSizes.dietLogPillGlowRadius);
    expect(glow.elevation).toBe(componentSizes.dietElevation);
  });

  it('renders the voice bar as real blurred night glass, matching frame 14a', () => {
    render(<DietHomeScreen />);
    expect(screen.UNSAFE_getAllByType(BlurView)).toHaveLength(2);
  });

  it('never renders the diet personalization card, the entries list, or the old "Today\'s plan" card', () => {
    render(<DietHomeScreen />);
    expect(screen.queryByText(/Personalize your diet/)).toBeNull();
    expect(screen.queryByText(/Nothing logged yet/)).toBeNull();
    expect(screen.queryByText("Today's plan")).toBeNull();
  });

  it('shows a calm error for a failed entries request, never "Nothing logged yet"', () => {
    mockEntries = undefined;
    mockEntriesError = true;
    render(<DietHomeScreen />);
    expect(screen.queryByText(/Nothing logged yet/)).toBeNull();
    expect(screen.getByText(/couldn.t load today.s numbers/i)).toBeTruthy();
    // No fabricated zero-consumption numbers while the real numbers failed to load.
    expect(screen.queryByText('Left today')).toBeNull();
  });

  it("uses a non-copy loading indicator while today's numbers load", () => {
    mockEntries = undefined;
    mockEntriesLoading = true;
    render(<DietHomeScreen />);
    expect(screen.getByLabelText("Loading today's numbers")).toBeTruthy();
    expect(screen.queryByText(/Loading today/)).toBeNull();
  });

  it('shows a calm error when the diet profile fails to load', () => {
    mockProfile = undefined;
    mockProfileError = true;
    render(<DietHomeScreen />);
    expect(screen.getByText(/Couldn.t load your targets just now\. Pull to refresh/i)).toBeTruthy();
  });

  it("pulling to refresh refetches both the diet profile and today's entries", () => {
    render(<DietHomeScreen />);
    const scrollView = screen.UNSAFE_getByType(RefreshControl);
    scrollView.props.onRefresh();
    expect(mockProfileRefetch).toHaveBeenCalledTimes(1);
    expect(mockEntriesRefetch).toHaveBeenCalledTimes(1);
  });
});
