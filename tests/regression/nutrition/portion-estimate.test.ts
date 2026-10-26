/**
 * Issue #33 — the portion sheet must show a live estimate that scales from the meal's *base*
 * macros (the values before any portion adjustment), matching the backend's own scaling rule
 * (`apps/meals/services/meal_operations.py:103-134`, read in the backend snapshot at
 * `scripts/overnight/.state/refs/backend`): `base_*` fields stay `null` until the first
 * adjust-quantity call, at which point they are seeded from the meal's current values — so the
 * frontend must fall back to the current value whenever `base_*` is `null`, exactly like the
 * backend's `if meal.base_calories_kcal is None: meal.base_calories_kcal = meal.calories_kcal`
 * (`meal_operations.py:112-116`). This also protects the "1.4×" / "2.75×" style formatting the
 * design (29c/36a) uses for the multiplier readout and typed-amount field.
 */

import {
  computePortionEstimate,
  formatMultiplier,
  resolvePortionBase,
} from '@/features/nutrition/lib/portionEstimate';
import type { PlannedMeal } from '@/shared/types/mealPlan';

function baseMeal(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return {
    id: 1,
    date: '2026-10-13',
    meal_type: 'lunch',
    name: 'Rice bowl with paneer and greens',
    calories_kcal: 500,
    protein_g: 30,
    carbs_g: 40,
    fat_g: 10,
    rationale: '',
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: null,
    repair_reason: '',
    constraint_violation: false,
    status: 'planned',
    serving_size: '1 serving',
    portion_multiplier: 1,
    base_calories_kcal: null,
    base_protein_g: null,
    base_carbs_g: null,
    base_fat_g: null,
    ingredients_json: [],
    prep_time_minutes: 20,
    estimated_cost_tier: 'moderate',
    confidence_note: '',
    ...overrides,
  };
}

describe('nutrition: resolvePortionBase (issue #33)', () => {
  it('falls back to the current macros when base_* is null (never adjusted yet)', () => {
    const meal = baseMeal({ calories_kcal: 500, protein_g: 30, carbs_g: 40, fat_g: 10 });
    expect(resolvePortionBase(meal)).toEqual({
      calories_kcal: 500,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 10,
    });
  });

  it('uses base_* when the meal was already adjusted once', () => {
    const meal = baseMeal({
      calories_kcal: 750, // already scaled by a previous 1.5x adjustment
      protein_g: 45,
      carbs_g: 60,
      fat_g: 15,
      base_calories_kcal: 500,
      base_protein_g: 30,
      base_carbs_g: 40,
      base_fat_g: 10,
      portion_multiplier: 1.5,
    });
    expect(resolvePortionBase(meal)).toEqual({
      calories_kcal: 500,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 10,
    });
  });
});

describe('nutrition: computePortionEstimate (issue #33)', () => {
  it('scales each macro from the base by the multiplier and rounds to whole numbers', () => {
    const base = { calories_kcal: 500, protein_g: 30, carbs_g: 40, fat_g: 10 };
    expect(computePortionEstimate(base, 1.4)).toEqual({
      calories_kcal: 700,
      protein_g: 42,
      carbs_g: 56,
      fat_g: 14,
    });
  });

  it('resets to the exact base at 1x (no drift)', () => {
    const base = { calories_kcal: 640, protein_g: 32, carbs_g: 74, fat_g: 22 };
    expect(computePortionEstimate(base, 1)).toEqual(base);
  });

  it('supports amounts beyond the slider range, like the design’s "any amount you like"', () => {
    const base = { calories_kcal: 400, protein_g: 20, carbs_g: 30, fat_g: 8 };
    expect(computePortionEstimate(base, 5)).toEqual({
      calories_kcal: 2000,
      protein_g: 100,
      carbs_g: 150,
      fat_g: 40,
    });
  });
});

describe('nutrition: formatMultiplier (issue #33 — "1.4×" / "2.75×" readouts)', () => {
  it.each([
    [1.4, '1.4'],
    [2, '2'],
    [2.75, '2.75'],
    [0.25, '0.25'],
    [0.5, '0.5'],
    [1, '1'],
    [3, '3'],
  ])('formats %s as "%s"', (value, expected) => {
    expect(formatMultiplier(value)).toBe(expected);
  });
});
