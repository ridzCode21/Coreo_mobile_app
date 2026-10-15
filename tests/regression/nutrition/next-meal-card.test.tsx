/**
 * Issue #22 — the "Next meal" card (design-spec.md lines 25-27, markup lines 82-86) replaces the
 * old multi-meal `MealPlanCard` on Diet home. It shows only the next unlogged planned meal for
 * today, sourced from the same `useMealPlanQuery` already wired for the full plan screen
 * (`src/features/nutrition/api/mealPlanApi.ts:35-44`). The design has no loading/empty/error
 * variant for this card, so it renders nothing rather than fabricating one.
 */

import { render, screen } from '@testing-library/react-native';

import { NextMealCard } from '@/features/nutrition/components/NextMealCard';
import type { MealPlanDetail } from '@/shared/types/mealPlan';

let mockPlan: Partial<MealPlanDetail> | undefined;

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: mockPlan, isLoading: false, isError: false }),
}));

describe('nutrition: NextMealCard (issue #22)', () => {
  beforeEach(() => {
    mockPlan = undefined;
  });

  it('shows the eyebrow, the meal name and the carbs line for the next planned meal', () => {
    mockPlan = {
      status: 'ready',
      meals: [
        {
          id: 1,
          meal_type: 'lunch',
          name: 'Rice bowl with paneer and greens',
          carbs_g: 90,
          status: 'planned',
        },
      ] as MealPlanDetail['meals'],
    };
    render(<NextMealCard date="2026-07-06" />);
    expect(screen.getByText('Next meal · before 1 PM')).toBeTruthy();
    expect(screen.getByText('Rice bowl with paneer and greens')).toBeTruthy();
    expect(screen.getByText('90g carbs, carries you through tonight.')).toBeTruthy();
  });

  it('picks the earliest still-planned meal when several meals exist', () => {
    mockPlan = {
      status: 'ready',
      meals: [
        {
          id: 1,
          meal_type: 'breakfast',
          name: 'Poha',
          carbs_g: 40,
          status: 'logged_as_planned',
        },
        {
          id: 2,
          meal_type: 'dinner',
          name: 'Khichdi',
          carbs_g: 60,
          status: 'planned',
        },
      ] as MealPlanDetail['meals'],
    };
    render(<NextMealCard date="2026-07-06" />);
    expect(screen.getByText('Khichdi')).toBeTruthy();
    expect(screen.queryByText('Poha')).toBeNull();
  });

  it('renders nothing when the plan is not ready', () => {
    mockPlan = { status: 'generating', meals: [] };
    const { toJSON } = render(<NextMealCard date="2026-07-06" />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when there is no plan at all', () => {
    mockPlan = undefined;
    const { toJSON } = render(<NextMealCard date="2026-07-06" />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when every meal is already logged, skipped or replaced', () => {
    mockPlan = {
      status: 'ready',
      meals: [
        { id: 1, meal_type: 'breakfast', name: 'Poha', carbs_g: 40, status: 'logged_as_planned' },
        { id: 2, meal_type: 'lunch', name: 'Dal rice', carbs_g: 50, status: 'skipped' },
      ] as MealPlanDetail['meals'],
    };
    const { toJSON } = render(<NextMealCard date="2026-07-06" />);
    expect(toJSON()).toBeNull();
  });
});
