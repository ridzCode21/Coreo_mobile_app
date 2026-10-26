/**
 * Issue #37 — design screen 33a "Plan check · repaired" (design-spec.md lines 1-45, design lines
 * 3889-3928), layered onto the already-shipped 28c "ready" screen (`PlanReadyState`,
 * meal-plan-ready-state.test.tsx / issue #31). The design's header ("Diet"/"Day 6") and title
 * ("Carbs early, protein steady — here's the shape of it.") only exist on this screen, so 33a is
 * this screen's repaired variant, not a new screen (plan.md Decision log).
 *
 * Backend alignment: `plan.self_check_status` and each meal's `repair_reason` come straight from
 * `GET /meal-plans/<date>/` (apps/meals/views.py:160,814); `repair_reason` is only ever non-empty
 * for the one meal swapped by `validate_meal_plan_task` (apps/meals/tasks.py:181-186), and only
 * includes "Nothing else changed." when exactly one meal was swapped (tasks.py:155-156
 * `only_change`). The "Adjusted for you" copy reuses the exact label already shipped for
 * `FullMealPlanScreen` (`FULL_PLAN_ROW_LABEL.adjusted`, lib/fullPlanRow.ts) for cross-screen
 * consistency — issue #32.
 *
 * Scope boundary (plan.md Decision log): this file does NOT change the already-shipped
 * calorie-number / checkmark row style from issue #31 to the design extract's
 * "Logged"/"Planned" text-label style — that belongs to a different, already-implemented row
 * convention and is out of scope for this issue. Only the repair banner, the "Adjusted for you"
 * indicator on the swapped meal's row, and the tap-hint footer are new.
 */

import { render, screen } from '@testing-library/react-native';

import { PlanReadyState } from '@/features/nutrition/components/PlanReadyState';
import type { MacroTargets } from '@/features/nutrition/lib/macros';
import type { MacroSummary } from '@/shared/types/food';
import type { MealPlanDetail, PlannedMeal } from '@/shared/types/mealPlan';

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

const REPAIR_SENTENCE =
  "Lunch didn't fit your shellfish note, so I swapped it for something that does. Nothing else changed.";

function planWith(meals: PlannedMeal[], selfCheckStatus: string): MealPlanDetail {
  return {
    id: 1,
    status: 'ready',
    failure_reason: '',
    date_start: '2026-10-16',
    date_end: '2026-10-16',
    total_calories: 1000,
    total_protein_g: 80,
    total_carbs_g: 100,
    total_fat_g: 30,
    validation_result: {
      self_check_status: selfCheckStatus,
      macro_ok: true,
      violation_count: selfCheckStatus === 'repaired' ? 1 : 0,
      self_check_issues: [],
    },
    self_check_status: selfCheckStatus,
    plan_mode: 'standard',
    historical_fallback_reason: '',
    meals,
  };
}

const targets: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 220, fat_g: 60 };
const consumed: MacroSummary = { calories_in: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

function renderPlan(plan: MealPlanDetail) {
  return render(
    <PlanReadyState
      plan={plan}
      targets={targets}
      consumed={consumed}
      prompts={[]}
      onMeal={jest.fn()}
      onPrompt={jest.fn()}
      onSeeFullPlan={jest.fn()}
      onRegenerate={jest.fn()}
    />,
  );
}

describe('PlanReadyState · 33a plan check repaired (issue #37)', () => {
  it('shows the exact repair banner, the "Adjusted for you" chip, and the tap-hint footer', () => {
    const repaired = meal({
      id: 2,
      meal_type: 'lunch',
      name: 'Tofu stir-fry, brown rice',
      replacement_of_id: 20,
      repair_reason: REPAIR_SENTENCE,
    });
    const plan = planWith(
      [meal({ id: 1 }), repaired, meal({ id: 3, meal_type: 'dinner', name: 'Grilled fish' })],
      'repaired',
    );
    renderPlan(plan);

    expect(screen.getByText(REPAIR_SENTENCE)).toBeTruthy();
    expect(screen.getByText('Adjusted for you')).toBeTruthy();
    expect(screen.getByText('Tap Lunch to see what changed, or why.')).toBeTruthy();
  });

  it('never shows the repair banner, chip, or footer on an ordinary ready plan', () => {
    const plan = planWith(
      [meal({ id: 1 }), meal({ id: 2, meal_type: 'lunch' }), meal({ id: 3, meal_type: 'dinner' })],
      'passed',
    );
    renderPlan(plan);

    expect(screen.queryByText(/didn't fit/)).toBeNull();
    expect(screen.queryByText('Adjusted for you')).toBeNull();
    expect(screen.queryByText(/Tap .* to see what changed, or why\./)).toBeNull();
  });

  it('never invents a repair banner when self_check_status is "repaired" but no meal carries a reason', () => {
    const plan = planWith(
      [meal({ id: 1 }), meal({ id: 2, meal_type: 'lunch' }), meal({ id: 3, meal_type: 'dinner' })],
      'repaired',
    );
    renderPlan(plan);

    expect(screen.queryByText(/didn't fit/)).toBeNull();
    expect(screen.queryByText('Adjusted for you')).toBeNull();
  });

  it('stays silent on the banner and footer (but still chips every swapped row) when more than one meal was repaired', () => {
    const plan = planWith(
      [
        meal({
          id: 1,
          repair_reason: "Breakfast didn't fit your diet, so I swapped it for something that does.",
          replacement_of_id: 10,
        }),
        meal({
          id: 2,
          meal_type: 'lunch',
          repair_reason: "Lunch didn't fit your diet, so I swapped it for something that does.",
          replacement_of_id: 20,
        }),
      ],
      'repaired',
    );
    renderPlan(plan);

    expect(screen.queryByText(/Nothing else changed\./)).toBeNull();
    expect(screen.queryByText(/Tap .* to see what changed, or why\./)).toBeNull();
    expect(screen.getAllByText('Adjusted for you')).toHaveLength(2);
  });
});
