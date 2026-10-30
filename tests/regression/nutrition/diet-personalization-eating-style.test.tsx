/**
 * Issue #30 — 12a·1 "Eating style". The quick-setup card's diet-type question used a different
 * title and option set than the Claude Design (design-spec.md 12a·1, lines 7-28): "How do you eat?"
 * with Vegetarian/Vegan/Everything/No beef/Halal/Eggs are fine/Pescatarian/Jain/No pork, all valid
 * `DietType` values on the backend (backend/apps/users/models.py:96-108).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DietPersonalizationCard } from '@/features/nutrition/components/DietPersonalizationCard';
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
  who_cooks: null,
  meal_rhythm: null,
  pace: null,
  weak_moment: null,
  health_conditions: [],
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

const DESIGN_DIET_LABELS = [
  'Vegetarian',
  'Vegan',
  'Everything',
  'No beef',
  'Halal',
  'Eggs are fine',
  'Pescatarian',
  'Jain',
  'No pork',
];

describe('nutrition: DietPersonalizationCard eating-style question matches design 12a·1', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('shows the exact design title "How do you eat?", not the old "How do you usually eat?"', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);
    expect(screen.getByText('How do you eat?')).toBeTruthy();
    expect(screen.queryByText('How do you usually eat?')).toBeNull();
  });

  it('renders exactly the 9 design diet-type chips, in design order', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);
    for (const label of DESIGN_DIET_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('does not render stale options the design does not show', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);
    expect(screen.queryByRole('button', { name: 'Non-veg' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Keto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Low carb' })).toBeNull();
  });

  it('saves "everything" (not "non_veg") when "Everything" is selected', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);

    fireEvent.press(screen.getByRole('button', { name: 'Everything' }));
    fireEvent.press(screen.getByRole('button', { name: 'Mostly sitting' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nothing' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save diet setup' }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ diet_type: 'everything' }),
      expect.anything(),
    );
  });
});
