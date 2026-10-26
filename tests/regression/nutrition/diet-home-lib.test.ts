/**
 * Issue #22 — pure helpers behind the Diet home (14a) redesign: picking the next unlogged planned
 * meal for the "Next meal" card (design-spec.md lines 25-27), and formatting the "78 → 72" weight
 * chip (design-spec.md line 12) from the diet profile's nullable `weight_kg`/`target_weight_kg`
 * (`src/shared/types/dietProfile.ts:79-80`) without ever inventing a number.
 */

import {
  formatWeightChip,
  MEAL_CLOSER_COPY,
  MEAL_WINDOW_COPY,
  nextPlannedMeal,
} from '@/features/nutrition/lib/dietHome';
import type { MealType } from '@/shared/types/food';
import type { PlannedMeal } from '@/shared/types/mealPlan';

const ALL_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 1,
    date: '2026-07-06',
    meal_type: 'lunch',
    name: 'Rice bowl with paneer and greens',
    calories_kcal: 520,
    protein_g: 28,
    carbs_g: 90,
    fat_g: 14,
    rationale: '',
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: null,
    repair_reason: '',
    constraint_violation: false,
    status: 'planned',
    serving_size: '1 bowl',
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

describe('nutrition: nextPlannedMeal (issue #22)', () => {
  it('returns the first planned-status meal in breakfast → lunch → dinner → snack order', () => {
    const meals = [
      meal({ id: 1, meal_type: 'snack', status: 'planned' }),
      meal({ id: 2, meal_type: 'dinner', status: 'planned' }),
      meal({ id: 3, meal_type: 'breakfast', status: 'logged_as_planned' }),
      meal({ id: 4, meal_type: 'lunch', status: 'planned' }),
    ];
    expect(nextPlannedMeal(meals)?.id).toBe(4);
  });

  it('skips logged, skipped, replaced, eaten-outside and missed meals', () => {
    const meals = [
      meal({ id: 1, meal_type: 'breakfast', status: 'logged_as_planned' }),
      meal({ id: 2, meal_type: 'lunch', status: 'skipped' }),
      meal({ id: 3, meal_type: 'dinner', status: 'replaced' }),
      meal({ id: 4, meal_type: 'snack', status: 'planned' }),
    ];
    expect(nextPlannedMeal(meals)?.id).toBe(4);
  });

  it('returns null when no meal is still planned', () => {
    const meals = [
      meal({ id: 1, meal_type: 'breakfast', status: 'logged_as_planned' }),
      meal({ id: 2, meal_type: 'lunch', status: 'eaten_outside' }),
    ];
    expect(nextPlannedMeal(meals)).toBeNull();
  });

  it('returns null for an empty meal list', () => {
    expect(nextPlannedMeal([])).toBeNull();
  });
});

describe('nutrition: formatWeightChip (issue #22)', () => {
  it('rounds both values and joins with " → "', () => {
    expect(formatWeightChip(78.4, 72.2)).toBe('78 → 72');
  });

  it('returns null when the current weight is missing (never invents a number)', () => {
    expect(formatWeightChip(null, 72)).toBeNull();
  });

  it('returns null when the target weight is missing', () => {
    expect(formatWeightChip(78, null)).toBeNull();
  });

  it('returns null when both are missing', () => {
    expect(formatWeightChip(null, null)).toBeNull();
  });
});

describe('nutrition: next-meal copy maps (issue #22)', () => {
  it('has a window and a closing line for every meal type', () => {
    for (const type of ALL_MEAL_TYPES) {
      expect(typeof MEAL_WINDOW_COPY[type]).toBe('string');
      expect(MEAL_WINDOW_COPY[type].length).toBeGreaterThan(0);
      expect(typeof MEAL_CLOSER_COPY[type]).toBe('string');
      expect(MEAL_CLOSER_COPY[type].length).toBeGreaterThan(0);
    }
  });

  it("matches the design's literal lunch example exactly (design-spec.md lines 25, 27)", () => {
    expect(MEAL_WINDOW_COPY.lunch).toBe('before 1 PM');
    expect(MEAL_CLOSER_COPY.lunch).toBe('carries you through tonight.');
  });
});
