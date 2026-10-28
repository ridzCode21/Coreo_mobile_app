/**
 * Issue #128 — `groupEntriesByMeal` (`src/features/nutrition/lib/macros.ts:84-91`) already shipped
 * with a doc comment describing exactly the grouping the new `TodayEntriesScreen` needs, but had no
 * direct test of its own before this issue (confirmed: it was never imported anywhere in `src/`).
 * This protects the pure rule the screen relies on, independent of any component rendering.
 */

import { groupEntriesByMeal } from '@/features/nutrition/lib/macros';
import type { FoodEntry, MealType } from '@/shared/types/food';

function entry(id: number, meal_type: MealType, food_name: string): FoodEntry {
  return {
    id,
    date: '2026-07-06',
    meal_type,
    food_item: null,
    food_name,
    portion_g: 100,
    calories: 200,
    protein_g: 10,
    carbs_g: 20,
    fat_g: 5,
    source: 'manual',
    ai_guess: null,
    created_at: '2026-07-06T08:00:00Z',
  };
}

describe('nutrition: groupEntriesByMeal (issue #128)', () => {
  it('returns an empty array for no entries', () => {
    expect(groupEntriesByMeal([])).toEqual([]);
  });

  it('groups entries under their meal in breakfast, lunch, dinner, snack order regardless of input order', () => {
    const entries = [
      entry(1, 'snack', 'Nuts'),
      entry(2, 'breakfast', 'Poha'),
      entry(3, 'dinner', 'Khichdi'),
      entry(4, 'lunch', 'Dal rice'),
    ];
    const sections = groupEntriesByMeal(entries);
    expect(sections.map((section) => section.meal)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ]);
  });

  it('omits meals with no entries', () => {
    const entries = [entry(1, 'lunch', 'Dal rice')];
    const sections = groupEntriesByMeal(entries);
    expect(sections).toEqual([{ meal: 'lunch', entries: [entries[0]] }]);
  });

  it('keeps multiple entries for the same meal in their original relative order', () => {
    const entries = [entry(1, 'lunch', 'Dal rice'), entry(2, 'lunch', 'Roti')];
    const sections = groupEntriesByMeal(entries);
    expect(sections).toEqual([{ meal: 'lunch', entries: [entries[0], entries[1]] }]);
  });
});
