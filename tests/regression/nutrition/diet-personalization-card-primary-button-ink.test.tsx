/**
 * Issue #126 — the diet quick-setup card's "Save diet setup" primary action painted a legacy
 * coreBlue fill instead of the design's solid ink (#17191D)
 * (docs/design-system.md §1 law 4: "Primary buttons are solid ink").
 */

import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { DietPersonalizationCard } from '@/features/nutrition/components/DietPersonalizationCard';
import { colors } from '@/shared/theme/tokens';
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

// Diet type and activity level left unset so `profileCompletion().dietQuick` is false and the
// quick-setup card (the only place in this component that still used coreBlue) renders.
const INCOMPLETE_PROFILE: DietProfile = {
  onboarding_complete: false,
  goal_type: null,
  weight_kg: null,
  target_weight_kg: null,
  height_cm: null,
  activity_level: null,
  diet_type: null,
  allergies: [],
  disliked_foods: [],
  cuisine_preference: null,
  cooking_time_max: 30,
  meal_frequency: 3,
  budget_tier: null,
  eating_pattern: null,
  cooking_frequency: null,
  health_conditions: [],
  target_source: 'calculated',
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 200,
  daily_fat_g: 60,
};

describe('nutrition: DietPersonalizationCard quick-setup primary button is solid ink (issue #126)', () => {
  it('fills "Save diet setup" with solid ink, not the retired coreBlue fill', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);

    const button = screen.getByRole('button', { name: 'Save diet setup' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ backgroundColor: colors.ink });
  });
});
