/**
 * Pure macro/calorie-budget helpers for the nutrition pillar. Kept pure + isolated (no React, no
 * I/O) so they're trivially unit-testable once the test harness lands (AGENTS.md §7). The Diet
 * home "Left today" card and its macro bars are derived from these — never stored (architecture.md
 * §3: derived data is computed from source of truth, not duplicated into a store).
 */

import type { MealType, FoodEntry, MacroSummary } from '@/shared/types/food';
import type { DietProfile } from '@/shared/types/dietProfile';

export type MacroTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type RemainingMacros = {
  /** May be negative when over budget — the UI renders this neutrally, never red (design-system §10). */
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Pull the four daily targets off the diet profile (API_REFERENCE.md §5). */
export function targetsFromProfile(profile: DietProfile): MacroTargets {
  return {
    calories: finiteNumber(profile.daily_calories),
    protein_g: finiteNumber(profile.daily_protein_g),
    carbs_g: finiteNumber(profile.daily_carbs_g),
    fat_g: finiteNumber(profile.daily_fat_g),
  };
}

export function normalizeMacroSummary(summary: Partial<MacroSummary> | null | undefined): MacroSummary {
  return {
    calories_in: finiteNumber(summary?.calories_in),
    protein_g: finiteNumber(summary?.protein_g),
    carbs_g: finiteNumber(summary?.carbs_g),
    fat_g: finiteNumber(summary?.fat_g),
  };
}

/** `remaining = target − consumed`, per macro. Can go negative (over budget) — that's intentional. */
export function computeRemaining(targets: MacroTargets, consumed: MacroSummary): RemainingMacros {
  return {
    calories: finiteNumber(targets.calories) - finiteNumber(consumed.calories_in),
    protein_g: finiteNumber(targets.protein_g) - finiteNumber(consumed.protein_g),
    carbs_g: finiteNumber(targets.carbs_g) - finiteNumber(consumed.carbs_g),
    fat_g: finiteNumber(targets.fat_g) - finiteNumber(consumed.fat_g),
  };
}

/** Fill ratio for a progress bar, clamped to `0..1` so a bar never overflows its track visually. */
export function macroFillRatio(consumed: number, target: number): number {
  const safeTarget = finiteNumber(target);
  if (safeTarget <= 0) return 0;
  return Math.min(1, Math.max(0, finiteNumber(consumed) / safeTarget));
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Group a day's entries by meal for a sectioned list, in a stable meal order; empty meals omitted. */
export function groupEntriesByMeal(
  entries: FoodEntry[],
): { meal: MealType; entries: FoodEntry[] }[] {
  return MEAL_ORDER.map((meal) => ({
    meal,
    entries: entries.filter((entry) => entry.meal_type === meal),
  })).filter((section) => section.entries.length > 0);
}

/** Scale a per-100g `FoodItem`-style macro set to a given gram portion (used by search/barcode prefill). */
export function scalePer100g(
  per100g: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  grams: number,
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = grams / 100;
  const round1 = (n: number) => Math.round(n * factor * 10) / 10;
  return {
    calories: Math.round(per100g.calories * factor),
    protein_g: round1(per100g.protein_g),
    carbs_g: round1(per100g.carbs_g),
    fat_g: round1(per100g.fat_g),
  };
}
