/**
 * Issue #37 — `fullPlanRowState` must flag a repaired/swapped meal as `'adjusted'` ahead of any
 * other row state, since the backend truthfully exposes this via `PlannedMeal.replacement_of_id`
 * (`apps/meals/tasks.py:563-592` sets `replacement_of` on the new meal when the plan check repairs
 * it; `apps/meals/views.py` serializes it as `replacement_of_id`). This is the only part of design
 * screen 33a ("Plan check · repaired") this issue builds — see plan.md's Decision log for why the
 * rest (banner copy, headline, Day chip) stays out of scope.
 */

import { fullPlanRowState } from '@/features/nutrition/lib/fullPlanRow';
import type { PlannedMeal, PlannedMealStatus } from '@/shared/types/mealPlan';

const BASE_MEAL: PlannedMeal = {
  id: 1,
  date: '2026-10-16',
  meal_type: 'lunch',
  name: 'Tofu stir-fry, brown rice',
  calories_kcal: 500,
  protein_g: 30,
  carbs_g: 60,
  fat_g: 12,
  rationale: '',
  recipe_json: null,
  replaced_at: null,
  replacement_of_id: null,
  constraint_violation: false,
  status: 'planned',
  serving_size: '1 bowl',
  portion_multiplier: 1,
  base_calories_kcal: 500,
  base_protein_g: 30,
  base_carbs_g: 60,
  base_fat_g: 12,
  ingredients_json: [],
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate',
  confidence_note: '',
};

describe('fullPlanRowState · adjusted (repaired) meals (issue #37)', () => {
  it.each<PlannedMealStatus>([
    'planned',
    'logged_as_planned',
    'logged_modified',
    'skipped',
    'missed',
  ])('returns "adjusted" whenever replacement_of_id is set, regardless of status=%s', (status) => {
    const meal: PlannedMeal = { ...BASE_MEAL, status, replacement_of_id: 42 };
    expect(fullPlanRowState(meal, null)).toBe('adjusted');
  });

  it('returns "adjusted" even when the repaired meal is also the next meal', () => {
    const meal: PlannedMeal = { ...BASE_MEAL, id: 7, status: 'planned', replacement_of_id: 42 };
    expect(fullPlanRowState(meal, 7)).toBe('adjusted');
  });

  it('leaves every existing branch untouched when replacement_of_id is null', () => {
    expect(
      fullPlanRowState(
        { ...BASE_MEAL, status: 'logged_as_planned', replacement_of_id: null },
        null,
      ),
    ).toBe('logged');
    expect(
      fullPlanRowState({ ...BASE_MEAL, status: 'eaten_outside', replacement_of_id: null }, null),
    ).toBe('logged');
    expect(
      fullPlanRowState({ ...BASE_MEAL, status: 'skipped', replacement_of_id: null }, null),
    ).toBe('skipped');
    expect(
      fullPlanRowState({ ...BASE_MEAL, status: 'missed', replacement_of_id: null }, null),
    ).toBe('skipped');
    expect(
      fullPlanRowState({ ...BASE_MEAL, id: 9, status: 'planned', replacement_of_id: null }, 9),
    ).toBe('next');
    expect(
      fullPlanRowState({ ...BASE_MEAL, id: 9, status: 'planned', replacement_of_id: null }, 10),
    ).toBe('planned');
  });
});
