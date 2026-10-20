/**
 * Issue #50 — `columnLabel()` turns a backend correlation column name
 * (`apps/insights/services.py:28-37`) into the human-readable chip label shown on 37b. These
 * labels are a frontend-only presentation choice (the API never returns a label) — plan.md
 * Decision log #6.
 */

import { columnLabel, insightColumnLabels } from '@/features/patterns/lib/insightColumns';

describe('patterns: columnLabel (#50)', () => {
  it('maps every backend correlation column to its exact label', () => {
    expect(insightColumnLabels).toEqual({
      calories_in: 'Calories in',
      calories_out: 'Calories out',
      protein_g: 'Protein',
      carbs_g: 'Carbs',
      fat_g: 'Fat',
      water_ml: 'Water',
      steps: 'Steps',
      weight_kg: 'Weight',
      sleep_hours: 'Sleep',
      hrv: 'HRV',
    });
  });

  it.each(
    Object.entries({
      calories_in: 'Calories in',
      calories_out: 'Calories out',
      protein_g: 'Protein',
      carbs_g: 'Carbs',
      fat_g: 'Fat',
      water_ml: 'Water',
      steps: 'Steps',
      weight_kg: 'Weight',
      sleep_hours: 'Sleep',
      hrv: 'HRV',
    }),
  )('columnLabel(%s) === %s', (column, label) => {
    expect(columnLabel(column)).toBe(label);
  });

  it('falls back to a safe title-cased rendering for an unmapped column, never blank', () => {
    expect(columnLabel('resting_heart_rate')).toBe('Resting heart rate');
  });
});
