/**
 * Issue #30 — 12a·6 "Weak moment". Reachable from "Improve recommendations" as the last checklist
 * item. Matches design-spec.md 12a·6 (lines 387-397): title, 6 options, "Build my fuel plan"
 * button. Backend field is `weak_moment` (backend/apps/users/models.py:163-169,
 * serializers.py:281) — previously dead client-only draft state (`onboardingStore.ts`
 * `weakMoments`) that was never sent in any PUT; this issue sends it for real. Picking
 * "late_night_snacks" also flips the backend's late-night guard on
 * (backend/apps/users/services/late_night_guard.py:56-61) — pure backend side effect, nothing
 * extra for the frontend to do.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DietPersonalizationCard } from '@/features/nutrition/components/DietPersonalizationCard';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import type { DietProfile } from '@/shared/types/dietProfile';

const mockMutate = jest.fn();
jest.mock('@/features/onboarding', () => {
  const lib = jest.requireActual<typeof import('@/features/onboarding/lib/profileCompletion')>(
    '@/features/onboarding/lib/profileCompletion',
  );
  return {
    profileChecklist: lib.profileChecklist,
    profileCompletion: lib.profileCompletion,
    useUpdateDietProfileMutation: () => ({ mutate: mockMutate, isPending: false }),
  };
});

// Every other checklist item is answered so "weak moment" — the last item — is the only one
// "Improve recommendations" can open.
const PROFILE_MISSING_WEAK_MOMENT: DietProfile = {
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
  cooking_frequency: null,
  who_cooks: 'i_cook',
  meal_rhythm: 'three_meals',
  pace: 'steady',
  weak_moment: null,
  health_conditions: ['none'],
  target_source: 'calculated',
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 60,
  late_night_guard: {
    enabled: false,
    check_in_time: '22:00',
    next_check_in_at: null,
    status_line: '',
  },
};

describe('nutrition: DietPersonalizationCard "weak moment" question matches design 12a·6', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    useAppFlagsStore.setState({
      dismissedDietQuickSetup: false,
      visitedProfileSections: { allergies: true },
    });
  });

  afterEach(() => {
    act(() => {
      useAppFlagsStore.setState({ dismissedDietQuickSetup: false, visitedProfileSections: {} });
    });
  });

  function openWeakMomentSheet() {
    render(<DietPersonalizationCard profile={PROFILE_MISSING_WEAK_MOMENT} />);
    fireEvent.press(screen.getByRole('button', { name: 'Improve recommendations' }));
  }

  it('shows the exact design title', () => {
    openWeakMomentSheet();
    expect(
      screen.getByText("Last one. When do you slip? I'll guard that hour with you."),
    ).toBeTruthy();
  });

  it('renders the 6 design options and a "Build my fuel plan" button', () => {
    openWeakMomentSheet();
    for (const label of [
      'Skipping meals',
      'Late-night snacks',
      'Ordering out',
      'Stress eating',
      'Weekends',
      'Sugar',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Build my fuel plan' })).toBeTruthy();
  });

  it('saves weak_moment when an option is picked', () => {
    openWeakMomentSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Late-night snacks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Build my fuel plan' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { weak_moment: 'late_night_snacks' },
      expect.anything(),
    );
  });
});
