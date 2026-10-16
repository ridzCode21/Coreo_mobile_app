/**
 * Issue #26 — pure scaling/formatting rules shared by the label result screen (21c) and the "how
 * many servings" sheet (21d). The label gives PER-SERVING macros only
 * (`apps/core/services/inference.py:132-143` — no backend field ever reflects "servings eaten");
 * the multiplier is a frontend-only concept applied before `POST /food/entries/`. Design 21d's
 * footnote "Scales straight off the label, no estimating" means this must be a straight
 * multiplication of the label's own numbers — never a re-estimate, never a new AI call. Kept pure
 * and isolated (no React) so it's trivially unit-testable per CLAUDE.md §7.
 */

import {
  clampServingsMultiplier,
  formatServingsLabel,
  roundGram,
  scaleLabelServing,
} from '@/features/nutrition/lib/labelServing';

const PER_SERVING = { est_calories: 250, est_protein_g: 10, est_carbs_g: 44, est_fat_g: 7 };

describe('nutrition: roundGram (issue #26)', () => {
  it('rounds gram values to one decimal for every label-serving calculation', () => {
    expect(roundGram(74.80000000000001)).toBe(74.8);
    expect(roundGram(17.55)).toBe(17.6);
  });
});

describe('nutrition: scaleLabelServing (issue #26 — 21d "no estimating")', () => {
  it('returns the per-serving numbers unchanged at a 1.0x multiplier', () => {
    expect(scaleLabelServing(PER_SERVING, 1)).toEqual({
      calories: 250,
      protein_g: 10,
      carbs_g: 44,
      fat_g: 7,
    });
  });

  it('scales every macro by the same multiplier — a straight multiply, never a re-estimate', () => {
    expect(scaleLabelServing(PER_SERVING, 2.5)).toEqual({
      calories: 625,
      protein_g: 25,
      carbs_g: 110,
      fat_g: 17.5,
    });
  });

  it('rounds calories to a whole number and grams to one decimal', () => {
    expect(scaleLabelServing(PER_SERVING, 1.3)).toEqual({
      calories: 325, // 250 * 1.3 = 325
      protein_g: 13,
      carbs_g: 57.2,
      fat_g: 9.1,
    });
  });
});

describe('nutrition: clampServingsMultiplier (issue #26)', () => {
  it('clamps below 1 serving up to 1 — you cannot log less than one serving on this screen', () => {
    expect(clampServingsMultiplier(0.4, 2.5)).toBe(1);
    expect(clampServingsMultiplier(0, 2.5)).toBe(1);
  });

  it('clamps above the container size down to the container size', () => {
    expect(clampServingsMultiplier(3, 2.5)).toBe(2.5);
  });

  it('passes through a value already inside [1, servings_per_container]', () => {
    expect(clampServingsMultiplier(1.6, 2.5)).toBe(1.6);
  });
});

describe('nutrition: formatServingsLabel (issue #26 — the "1 serving" chip on 21c)', () => {
  it('formats exactly 1 as singular', () => {
    expect(formatServingsLabel(1)).toBe('1 serving');
  });

  it('formats any other amount as plural with up to 2 decimal places', () => {
    expect(formatServingsLabel(1.5)).toBe('1.5 servings');
    expect(formatServingsLabel(2.5)).toBe('2.5 servings');
    expect(formatServingsLabel(1.25)).toBe('1.25 servings');
  });

  it('drops a trailing .00 so whole numbers above 1 stay clean', () => {
    expect(formatServingsLabel(2)).toBe('2 servings');
  });
});
