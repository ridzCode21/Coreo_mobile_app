/**
 * Issue #128 — Reach the full plan and today's entries from Diet home. This file protects only the
 * "Today's entries" entry point on `DietHomeScreen` (placement decided in plan.md Decision log #7,
 * flagged there for the design owner to confirm): a plain text link below the hero macro-summary
 * section that opens the new `/diet/entries` screen. The destination screen's own copy/states are
 * covered by `today-entries-screen.test.tsx`. Same mocking pattern as the sibling
 * `diet-home-week-review-entry.test.tsx` (issue #29).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import DietHomeScreen from '@/features/nutrition/screens/DietHomeScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { FoodEntriesResponse } from '@/features/nutrition/api/nutritionApi';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: {
      weight_kg: 78,
      target_weight_kg: 72,
      daily_calories: 2000,
      daily_protein_g: 120,
      daily_carbs_g: 220,
      daily_fat_g: 70,
    } as Partial<DietProfile>,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-07-06',
  useFoodEntriesQuery: () => ({
    data: {
      entries: [],
      macro_summary: { calories_in: 760, protein_g: 62, carbs_g: 148, fat_g: 41 },
    } as FoodEntriesResponse,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUsualsQuery: () => ({
    data: { suggestions: [] },
    isLoading: false,
    isError: false,
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
  return { LogMealSheet: () => <Text testID="log-meal-sheet-stub">log-meal-sheet-stub</Text> };
});

jest.mock('@/features/nutrition/components/YourUsualsSheet', () => {
  const { Text } = jest.requireActual('react-native');
  return { YourUsualsSheet: () => <Text testID="your-usuals-sheet-stub">usuals-stub</Text> };
});

describe('nutrition: DietHomeScreen "Today\'s entries" entry point (issue #128)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a "Today\'s entries" entry point', () => {
    render(<DietHomeScreen />);
    expect(screen.getByLabelText("Today's entries")).toBeTruthy();
  });

  it('navigates to /diet/entries when pressed', () => {
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText("Today's entries"));
    expect(mockPush).toHaveBeenCalledWith('/diet/entries');
  });
});
