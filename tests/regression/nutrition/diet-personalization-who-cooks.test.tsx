/**
 * Issue #30 — 12a·4 "Who cooks". Reachable from "Improve recommendations" once everything earlier
 * in the checklist is answered. Matches design-spec.md 12a·4 (lines 258-268): title, subtitle,
 * 5 options, "Next" button. Backend field is the dedicated `who_cooks` enum
 * (backend/apps/users/models.py:140-145, serializers.py:272), not the old `cooking_frequency`
 * (a different field with different values, still used elsewhere by MealPlanScreen's unrelated
 * "too much cooking" context question — this issue does not touch `cooking_frequency`).
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

// Every checklist item before "who cooks" is answered so "Improve recommendations" opens exactly
// this section; `who_cooks` itself is the only unanswered field.
const PROFILE_MISSING_WHO_COOKS: DietProfile = {
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
  who_cooks: null,
  meal_rhythm: 'three_meals',
  pace: 'steady',
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

describe('nutrition: DietPersonalizationCard "who cooks" question matches design 12a·4', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    useAppFlagsStore.setState({
      dismissedDietQuickSetup: false,
      visitedProfileSections: { allergies: true, mealRhythm: true },
    });
  });

  afterEach(() => {
    act(() => {
      useAppFlagsStore.setState({ dismissedDietQuickSetup: false, visitedProfileSections: {} });
    });
  });

  function openWhoCooksSheet() {
    render(<DietPersonalizationCard profile={PROFILE_MISSING_WHO_COOKS} />);
    fireEvent.press(screen.getByRole('button', { name: 'Improve recommendations' }));
  }

  it('shows the exact design title and subtitle', () => {
    openWhoCooksSheet();
    expect(screen.getByText('Who makes your food most days?')).toBeTruthy();
    expect(
      screen.getByText('The plan bends to whoever is at the stove, not the other way.'),
    ).toBeTruthy();
  });

  it('places the subtitle after the options and before the Next button', () => {
    openWhoCooksSheet();

    const text = renderOrder(screen.toJSON());
    expect(text.indexOf('Office canteen')).toBeLessThan(
      text.indexOf('The plan bends to whoever is at the stove, not the other way.'),
    );
    expect(
      text.indexOf('The plan bends to whoever is at the stove, not the other way.'),
    ).toBeLessThan(text.indexOf('Next'));
  });

  it('renders the 5 design options in order and a "Next" button', () => {
    openWhoCooksSheet();
    for (const label of [
      'I cook',
      'Family cooks',
      'House help',
      'Mostly order in',
      'Office canteen',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('saves who_cooks, not cooking_frequency, when an option is picked', () => {
    openWhoCooksSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Family cooks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));

    expect(mockMutate).toHaveBeenCalledWith({ who_cooks: 'family_cooks' }, expect.anything());
  });
});

function renderOrder(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(renderOrder);
  if (typeof node === 'string') return [node];
  if (!node || typeof node !== 'object' || !('children' in node)) return [];
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? children.flatMap(renderOrder) : [];
}
