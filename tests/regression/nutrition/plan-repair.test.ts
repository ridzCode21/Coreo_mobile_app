/**
 * Issue #37 — screen 33a "Plan check · repaired" (design-spec.md lines 1-45, design lines
 * 3889-3928) needs to know which single meal a plan-check auto-repair swapped, driven by the
 * backend's per-meal `repair_reason` (apps/meals/models.py:126, serialized at
 * apps/meals/views.py:814). The banner sentence only makes sense — and only carries the design's
 * "Nothing else changed." promise — when exactly one meal was swapped
 * (apps/meals/tasks.py:155-156 `only_change`); when more than one meal changed there is no design
 * state for it, so the UI must stay silent rather than invent one (plan.md Decision log).
 */

import { soleRepairedMeal } from '@/features/nutrition/lib/planRepair';
import type { PlannedMeal } from '@/shared/types/mealPlan';

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 1,
    date: '2026-10-16',
    meal_type: 'breakfast',
    name: 'Greek yogurt, berries',
    calories_kcal: 300,
    protein_g: 20,
    carbs_g: 30,
    fat_g: 8,
    rationale: '',
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: null,
    constraint_violation: false,
    status: 'planned',
    serving_size: '1 bowl',
    portion_multiplier: 1,
    base_calories_kcal: 300,
    base_protein_g: 20,
    base_carbs_g: 30,
    base_fat_g: 8,
    ingredients_json: [],
    prep_time_minutes: 10,
    estimated_cost_tier: 'moderate',
    confidence_note: '',
    repair_reason: '',
    ...overrides,
  };
}

describe('soleRepairedMeal (issue #37)', () => {
  it('returns null when no meal carries a repair reason', () => {
    const meals = [meal({ id: 1 }), meal({ id: 2, meal_type: 'lunch' })];
    expect(soleRepairedMeal(meals)).toBeNull();
  });

  it('returns the single meal that carries a non-empty repair_reason', () => {
    const repaired = meal({
      id: 2,
      meal_type: 'lunch',
      name: 'Tofu stir-fry, brown rice',
      replacement_of_id: 20,
      repair_reason:
        "Lunch didn't fit your shellfish note, so I swapped it for something that does. Nothing else changed.",
    });
    const meals = [meal({ id: 1 }), repaired, meal({ id: 3, meal_type: 'dinner' })];
    expect(soleRepairedMeal(meals)).toBe(repaired);
  });

  it('returns null when more than one meal carries a repair reason (no design state for it)', () => {
    const meals = [
      meal({ id: 1, repair_reason: "Breakfast didn't fit your diet, so I swapped it." }),
      meal({
        id: 2,
        meal_type: 'lunch',
        repair_reason: "Lunch didn't fit your diet, so I swapped it.",
      }),
    ];
    expect(soleRepairedMeal(meals)).toBeNull();
  });

  it('returns null for an empty plan', () => {
    expect(soleRepairedMeal([])).toBeNull();
  });
});
