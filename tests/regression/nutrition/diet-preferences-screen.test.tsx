/**
 * Issue #127 — "Give the diet quick-setup card a home on the Profile screen". `DietPersonalizationCard`
 * has been orphaned since issue #22 removed it from Diet home ("Diet home is unchanged" is an
 * acceptance criterion here — this issue only re-homes the existing card, it doesn't touch
 * `DietHomeScreen`). This screen is the new home: a thin wrapper, reached by pushing
 * `/profile/diet-preferences` from the Profile screen's new "Diet preferences" row
 * (tests/regression/profile/profile-screen.test.tsx), that fetches the diet profile
 * (`useDietProfileQuery`, GET /users/me/diet-profile/ — src/features/onboarding/api/dietProfileApi.ts:19-24)
 * and hands it to the unmodified `DietPersonalizationCard`, which decides for itself whether to show
 * the 3-question quick setup or the "Improve recommendations" flow (both are "as before" per the
 * acceptance criteria — this screen doesn't re-implement that choice). `DietPersonalizationCard` is
 * stubbed out here (same pattern as `AccountActionsSection` in profile-screen.test.tsx) so this stays
 * a structure/data-plumbing test, not a re-test of the card's own internals (already covered by
 * tests/regression/nutrition/diet-personalization-card-primary-button-ink.test.tsx and the card's
 * other existing tests).
 */

import { ActivityIndicator } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DietPreferencesScreen from '@/features/nutrition/screens/DietPreferencesScreen';
import type { DietProfile } from '@/shared/types/dietProfile';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

let mockDietProfile: DietProfile | undefined;
let mockIsError: boolean;
jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: mockDietProfile,
    isLoading: !mockDietProfile && !mockIsError,
    isError: mockIsError,
  }),
}));

let capturedProfile: DietProfile | undefined;
jest.mock('@/features/nutrition/components/DietPersonalizationCard', () => ({
  DietPersonalizationCard: ({ profile }: { profile: DietProfile }) => {
    capturedProfile = profile;
    return null;
  },
}));

const PROFILE: DietProfile = {
  onboarding_complete: true,
  goal_type: 'lose_weight',
  weight_kg: 78,
  target_weight_kg: 72,
  height_cm: 170,
  activity_level: 'moderate',
  diet_type: 'vegetarian',
  allergies: [],
  disliked_foods: [],
  cuisine_preference: 'indian',
  cooking_time_max: 30,
  meal_frequency: 3,
  budget_tier: 'moderate',
  eating_pattern: null,
  cooking_frequency: 'once_daily',
  health_conditions: [],
  target_source: 'calculated',
  daily_calories: 1960,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 60,
};

describe('nutrition: DietPreferencesScreen (issue #127, re-homes DietPersonalizationCard onto Profile)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    capturedProfile = undefined;
    mockDietProfile = PROFILE;
    mockIsError = false;
  });

  it('shows the "Diet preferences" title', () => {
    render(<DietPreferencesScreen />);
    expect(screen.getByText('Diet preferences')).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    render(<DietPreferencesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator while the diet profile is loading, never a blank or stale screen', () => {
    mockDietProfile = undefined;
    render(<DietPreferencesScreen />);
    expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('shows an error message when the diet profile fails to load, never an invented profile', () => {
    mockDietProfile = undefined;
    mockIsError = true;
    render(<DietPreferencesScreen />);
    expect(screen.getByText('Unable to load your diet profile.')).toBeTruthy();
  });

  it('passes the real diet profile straight through to DietPersonalizationCard unmodified', () => {
    render(<DietPreferencesScreen />);
    expect(capturedProfile).toEqual(PROFILE);
  });
});
