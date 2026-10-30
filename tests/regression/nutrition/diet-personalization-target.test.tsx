/**
 * Issue #30 — 12a·3 "Target & pace". Reachable from "Improve recommendations". Matches
 * design-spec.md 12a·3 (lines 183-194): title interpolates the user's real current weight, a
 * target-weight slider, Gently/Steady/Push me pace pills, and a dynamic "{target}, {pace}" button
 * (e.g. "72, steady"). Backend fields: `target_weight_kg` (backend/apps/users/models.py:238, no
 * server-side range validation) and `pace` (`:135-138`, serializers.py:271).
 *
 * The target slider uses the real shared component. The tests cover its controlled visual contract;
 * drag physics are covered by the component's established gesture implementation rather than being
 * simulated by React Native Testing Library.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

// Every checklist item before "target" is answered so "Improve recommendations" opens exactly
// this section; `target_weight_kg`/`pace` are the only unanswered fields. Current weight is 78kg,
// matching the design's own example exactly (design-spec.md 12a·3).
const PROFILE_MISSING_TARGET: DietProfile = {
  onboarding_complete: true,
  goal_type: 'lose_weight',
  weight_kg: 78,
  target_weight_kg: null,
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
  pace: null,
  weak_moment: 'sugar',
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

describe('nutrition: DietPersonalizationCard "target & pace" question matches design 12a·3', () => {
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

  function openTargetSheet() {
    render(<DietPersonalizationCard profile={PROFILE_MISSING_TARGET} />);
    fireEvent.press(screen.getByRole('button', { name: 'Improve recommendations' }));
  }

  it('interpolates the real current weight into the exact design title', () => {
    openTargetSheet();
    expect(screen.getByText("You're at 78 kg. Where are we taking it?")).toBeTruthy();
  });

  it('shows the design’s large target readout and min/current captions', () => {
    openTargetSheet();

    expect(screen.getByText('72', { exact: true })).toBeTruthy();
    expect(screen.getByText('kg', { exact: true })).toBeTruthy();
    expect(screen.getByText('65', { exact: true })).toBeTruthy();
    expect(screen.getByText('78 now', { exact: true })).toBeTruthy();
  });

  it('renders the target unit at the design’s 14px size', () => {
    openTargetSheet();

    const unit = screen.getByText('kg', { exact: true });
    expect(StyleSheet.flatten(unit.props.style).fontSize).toBe(14);
  });

  it('renders the 3 design pace pills', () => {
    openTargetSheet();
    expect(screen.getByRole('button', { name: 'Gently' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Steady' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Push me' })).toBeTruthy();
  });

  it('defaults the button to "72, steady" for a 78kg current weight', () => {
    openTargetSheet();
    expect(screen.getByRole('button', { name: '72, steady' })).toBeTruthy();
  });

  it('updates the button text when a different pace is picked', () => {
    openTargetSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Push me' }));
    expect(screen.getByRole('button', { name: '72, push me' })).toBeTruthy();
  });

  it('saves target_weight_kg and pace together on save', () => {
    openTargetSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Push me' }));
    fireEvent.press(screen.getByRole('button', { name: '72, push me' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { target_weight_kg: 72, pace: 'push' },
      expect.anything(),
    );
  });
});
