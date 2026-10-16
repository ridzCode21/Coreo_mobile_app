/**
 * Issue #29 — Week in review screen. The issue's "Decide the entry point (Diet home) with the
 * owner" is resolved in plan.md's Decision log #1: a "Week in review" entry row on `DietHomeScreen`
 * that navigates to `/diet/week-review`. This file protects only that entry point — the
 * destination screen's own copy/states are covered by `week-in-review-screen.test.tsx`.
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

describe('nutrition: DietHomeScreen week-in-review entry point (issue #29)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a "Week in review" entry point', () => {
    render(<DietHomeScreen />);
    expect(screen.getByLabelText('Week in review')).toBeTruthy();
  });

  it('navigates to /diet/week-review when pressed', () => {
    render(<DietHomeScreen />);
    fireEvent.press(screen.getByLabelText('Week in review'));
    expect(mockPush).toHaveBeenCalledWith('/diet/week-review');
  });
});
