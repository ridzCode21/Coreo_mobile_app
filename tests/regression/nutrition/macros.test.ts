import {
  computeRemaining,
  macroFillRatio,
  normalizeMacroSummary,
  scalePer100g,
} from '@/features/nutrition/lib/macros';

describe('nutrition: macro helpers', () => {
  it('computes remaining macros and allows going over budget (shown neutrally, never red)', () => {
    const remaining = computeRemaining(
      { calories: 2000, protein_g: 100, carbs_g: 250, fat_g: 70 },
      { calories_in: 2100, protein_g: 60, carbs_g: 200, fat_g: 20 },
    );
    expect(remaining).toEqual({ calories: -100, protein_g: 40, carbs_g: 50, fat_g: 50 });
  });

  it('clamps the progress-bar fill ratio to 0..1 and survives a zero target', () => {
    expect(macroFillRatio(50, 100)).toBe(0.5);
    expect(macroFillRatio(500, 100)).toBe(1);
    expect(macroFillRatio(-5, 100)).toBe(0);
    expect(macroFillRatio(10, 0)).toBe(0);
  });

  it('turns missing or non-finite summary values into zero (never an invented number)', () => {
    expect(normalizeMacroSummary(undefined)).toEqual({
      calories_in: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
    expect(normalizeMacroSummary({ calories_in: NaN, protein_g: 12 }).calories_in).toBe(0);
  });

  it('scales a per-100g food to a gram portion', () => {
    expect(scalePer100g({ calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 }, 150)).toEqual({
      calories: 248,
      protein_g: 46.5,
      carbs_g: 0,
      fat_g: 5.4,
    });
  });
});
