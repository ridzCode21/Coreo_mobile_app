import { fullPlanRowState, FULL_PLAN_ROW_LABEL } from '@/features/nutrition/lib/fullPlanRow';
import type { PlannedMeal, PlannedMealStatus } from '@/shared/types/mealPlan';

function meal(status: PlannedMealStatus, id = 1): PlannedMeal {
  return {
    id,
    date: '2026-10-16',
    meal_type: 'lunch',
    name: 'Rice bowl',
    calories_kcal: 640,
    protein_g: 32,
    carbs_g: 74,
    fat_g: 22,
    rationale: '',
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: null,
    repair_reason: '',
    constraint_violation: false,
    status,
    serving_size: '1 serving',
    portion_multiplier: 1,
    base_calories_kcal: 640,
    base_protein_g: 32,
    base_carbs_g: 74,
    base_fat_g: 22,
    ingredients_json: [],
    prep_time_minutes: 20,
    estimated_cost_tier: 'moderate',
    confidence_note: '',
  };
}

describe('full plan row state', () => {
  it.each([
    ['logged_as_planned', 'logged'],
    ['logged_modified', 'logged'],
    ['eaten_outside', 'logged'],
    ['skipped', 'skipped'],
    ['missed', 'skipped'],
    ['replaced', 'planned'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(fullPlanRowState(meal(status), 99)).toBe(expected);
  });

  it('marks only the matching planned meal as next', () => {
    expect(fullPlanRowState(meal('planned', 4), 4)).toBe('next');
    expect(fullPlanRowState(meal('planned', 5), 4)).toBe('planned');
  });

  it('provides the exact design labels', () => {
    expect(FULL_PLAN_ROW_LABEL).toEqual({
      adjusted: 'Adjusted for you',
      logged: 'Logged',
      next: 'Next',
      skipped: 'Skipped',
      planned: 'Planned',
    });
  });
});
