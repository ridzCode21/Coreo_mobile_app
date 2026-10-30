/**
 * Issue #30 — 12a·2 "Off the table". The quick-setup card's allergy question used a different
 * title and chip order than the Claude Design (design-spec.md 12a·2, lines 100-114): "Anything
 * your body refuses? I never suggest what hurts you." with Peanuts/Dairy/Gluten/Shellfish/Soy/
 * Nothing — "Nothing" last, not a first "No allergies" chip. `allergies` is a free-string list on
 * the backend (backend/apps/users/serializers.py:312-315), so "Nothing" keeps the same
 * empty-array semantics as the old "No allergies" chip.
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

describe('nutrition: DietPersonalizationCard off-the-table question matches design 12a·2', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('shows the exact design title, not the old "Anything we should avoid?"', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);
    expect(
      screen.getByText('Anything your body refuses? I never suggest what hurts you.'),
    ).toBeTruthy();
    expect(screen.queryByText('Anything we should avoid?')).toBeNull();
  });

  it('renders the 6 design chips with "Nothing" last, not "No allergies" first', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);
    const labels = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Soy', 'Nothing'];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'No allergies' })).toBeNull();
  });

  it('selecting "Nothing" clears any selected allergens and saves an empty list', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);

    fireEvent.press(screen.getByRole('button', { name: 'Vegetarian' }));
    fireEvent.press(screen.getByRole('button', { name: 'Mostly sitting' }));
    fireEvent.press(screen.getByRole('button', { name: 'Peanuts' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nothing' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save diet setup' }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ allergies: [] }),
      expect.anything(),
    );
  });

  it('selecting Peanuts and Dairy saves both as lowercase values', () => {
    render(<DietPersonalizationCard profile={INCOMPLETE_PROFILE} />);

    fireEvent.press(screen.getByRole('button', { name: 'Vegetarian' }));
    fireEvent.press(screen.getByRole('button', { name: 'Mostly sitting' }));
    fireEvent.press(screen.getByRole('button', { name: 'Peanuts' }));
    fireEvent.press(screen.getByRole('button', { name: 'Dairy' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save diet setup' }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ allergies: ['peanuts', 'dairy'] }),
      expect.anything(),
    );
  });
});
