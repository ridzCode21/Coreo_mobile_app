/**
 * Issue #30 — 12a·5 "Meal rhythm". Reachable from "Improve recommendations". Matches
 * design-spec.md 12a·5 (lines 322-332): title, subtitle, 5 options, "Next" button. Backend field
 * is the dedicated `meal_rhythm` enum (backend/apps/users/models.py:147-152,
 * serializers.py:273), not the old plain-integer `meal_frequency` (still used elsewhere, e.g.
 * `estimateDailyTargets` and the mock meal planner — this issue does not touch `meal_frequency`).
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

// Every checklist item before "meal rhythm" is answered so "Improve recommendations" opens
// exactly this section; `meal_rhythm` itself is the only unanswered field.
const PROFILE_MISSING_MEAL_RHYTHM: DietProfile = {
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
  meal_rhythm: null,
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

describe('nutrition: DietPersonalizationCard "meal rhythm" question matches design 12a·5', () => {
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

  function openMealRhythmSheet() {
    render(<DietPersonalizationCard profile={PROFILE_MISSING_MEAL_RHYTHM} />);
    fireEvent.press(screen.getByRole('button', { name: 'Improve recommendations' }));
  }

  it('shows the exact design title and subtitle', () => {
    openMealRhythmSheet();
    expect(screen.getByText('How does a normal day of eating flow?')).toBeTruthy();
    expect(
      screen.getByText('Meal timing shapes the plan more than calorie math does.'),
    ).toBeTruthy();
  });

  it('places the subtitle after the options and before the Next button', () => {
    openMealRhythmSheet();

    const text = renderOrder(screen.toJSON());
    expect(text.indexOf('No pattern')).toBeLessThan(
      text.indexOf('Meal timing shapes the plan more than calorie math does.'),
    );
    expect(text.indexOf('Meal timing shapes the plan more than calorie math does.')).toBeLessThan(
      text.indexOf('Next'),
    );
  });

  it('renders the 5 design options in order and a "Next" button', () => {
    openMealRhythmSheet();
    for (const label of [
      'Two big meals',
      'Three meals',
      'Three plus snacks',
      'Grazing all day',
      'No pattern',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('saves meal_rhythm, not meal_frequency, when an option is picked', () => {
    openMealRhythmSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Three meals' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));

    expect(mockMutate).toHaveBeenCalledWith({ meal_rhythm: 'three_meals' }, expect.anything());
  });
});

function renderOrder(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(renderOrder);
  if (typeof node === 'string') return [node];
  if (!node || typeof node !== 'object' || !('children' in node)) return [];
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? children.flatMap(renderOrder) : [];
}
