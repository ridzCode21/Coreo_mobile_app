/**
 * Issue #34 — "Ate something else" sent `approx_protein_g = Math.round(outsideCalories * 0.08)`,
 * an invented number the user never gave (`src/features/nutrition/screens/MealDetailScreen.tsx:185`
 * pre-fix). The backend never requires it: `apps/meals/services/meal_operations.py:213` builds the
 * `FoodEntry` with `protein_g=float(approx_protein_g or 0)`, and the view
 * (`apps/meals/views.py:557-558`) passes `request.data.get('approx_protein_g')` straight through
 * with no validation — so omitting the field is safe and the API_REFERENCE.md:1513 sample request
 * (which includes it) is only an example, not a requirement. This protects the payload the app
 * actually sends: no made-up protein value, ever.
 */

import { buildAteSomethingElsePayload } from '@/features/nutrition/lib/ateSomethingElsePayload';

describe('nutrition: buildAteSomethingElsePayload (issue #34 — no invented protein number)', () => {
  it('builds the request body from the meal, description and chosen calorie estimate only', () => {
    const payload = buildAteSomethingElsePayload(
      { id: 42, meal_type: 'dinner' },
      'Leftover pizza, two slices',
      500,
    );

    expect(payload).toEqual({
      meal_type: 'dinner',
      planned_meal_id: 42,
      description: 'Leftover pizza, two slices',
      approx_calories: 500,
    });
  });

  it('never includes approx_protein_g, at any calorie value', () => {
    const payload = buildAteSomethingElsePayload({ id: 1, meal_type: 'lunch' }, 'Salad', 300);

    expect(payload).not.toHaveProperty('approx_protein_g');
    expect(Object.keys(payload).sort()).toEqual(
      ['meal_type', 'planned_meal_id', 'description', 'approx_calories'].sort(),
    );
  });

  it('trims the description before sending it', () => {
    const payload = buildAteSomethingElsePayload(
      { id: 7, meal_type: 'snack' },
      '  Protein bar  ',
      300,
    );

    expect(payload.description).toBe('Protein bar');
  });
});
