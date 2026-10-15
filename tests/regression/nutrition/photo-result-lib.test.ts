/**
 * Issue #25 — "After the snap screens for photo and receipt." 21a needs to pick out the single
 * "one thing I couldn't see" caveat from the photo estimate's `items[]` (there is no top-level
 * `guess_note` on `POST /food/photo/` — only per-item, `apps/core/services/inference.py:104-116`),
 * 21b needs a deterministic (never-guessed) word for "leaves N for {meal}", and both 21a's direct
 * "Looks right" and Check My Math's save need the exact same item→entry mapping so a plain
 * (un-multiplied) save and an edited save stay consistent.
 */

import {
  itemsToEntries,
  nextMealLabel,
  pickGuessNote,
  sortByGuessed,
} from '@/features/nutrition/lib/photoResult';
import type { PhotoEstimateItem } from '@/shared/types/food';

const RICE: PhotoEstimateItem = {
  name: 'Steamed rice',
  portion_label: '1 cup',
  portion_grams: 150,
  est_calories: 205,
  est_protein_g: 4,
  est_carbs_g: 45,
  est_fat_g: 1,
  confidence: 0.92,
  guessed: false,
  guess_note: null,
  remembered: false,
};

const DRESSING: PhotoEstimateItem = {
  name: 'Dressing',
  portion_label: null,
  portion_grams: 14,
  est_calories: 135,
  est_protein_g: 0,
  est_carbs_g: 0,
  est_fat_g: 15,
  confidence: 0.5,
  guessed: true,
  guess_note: 'The dressing. Ghee or oil changes 90 kcal.',
  remembered: false,
};

const GREENS: PhotoEstimateItem = {
  name: 'Sautéed greens',
  portion_label: '1 cup',
  portion_grams: 100,
  est_calories: 80,
  est_protein_g: 3,
  est_carbs_g: 8,
  est_fat_g: 4,
  confidence: 0.95,
  guessed: false,
  guess_note: null,
  remembered: false,
};

describe('nutrition: pickGuessNote (issue #25)', () => {
  it('returns null when no item is guessed', () => {
    expect(pickGuessNote([RICE, GREENS])).toBeNull();
  });

  it('returns the first guessed item and its note when exactly one item is guessed', () => {
    expect(pickGuessNote([RICE, DRESSING, GREENS])).toEqual({
      item: DRESSING,
      note: 'The dressing. Ghee or oil changes 90 kcal.',
    });
  });

  it('returns only the FIRST guessed item when more than one is guessed (design shows one card)', () => {
    const secondGuess: PhotoEstimateItem = {
      ...GREENS,
      name: 'Mystery sauce',
      guessed: true,
      guess_note: 'Could not place this one.',
    };
    const result = pickGuessNote([RICE, DRESSING, secondGuess]);
    expect(result?.item.name).toBe('Dressing');
  });

  it('returns null for a guessed item with a null guess_note rather than showing empty text', () => {
    const guessedNoNote: PhotoEstimateItem = { ...DRESSING, guess_note: null };
    expect(pickGuessNote([guessedNoNote])).toBeNull();
  });
});

describe('nutrition: nextMealLabel (issue #25)', () => {
  it('maps breakfast to lunch', () => {
    expect(nextMealLabel('breakfast')).toBe('lunch');
  });

  it('maps lunch to dinner (the design-shown case)', () => {
    expect(nextMealLabel('lunch')).toBe('dinner');
  });

  it('maps dinner to tomorrow (no later meal slot today)', () => {
    expect(nextMealLabel('dinner')).toBe('tomorrow');
  });

  it('maps snack to a generic next meal (no fixed slot)', () => {
    expect(nextMealLabel('snack')).toBe('next meal');
  });
});

describe('nutrition: sortByGuessed (issue #25)', () => {
  it('moves guessed items last without mutating the estimate order', () => {
    const items = [RICE, DRESSING, GREENS];

    expect(sortByGuessed(items)).toEqual([RICE, GREENS, DRESSING]);
    expect(items).toEqual([RICE, DRESSING, GREENS]);
  });
});

describe("nutrition: itemsToEntries (issue #25 — shared with Check My Math's save)", () => {
  it('builds one entry per item at multiplier 1 with the ORIGINAL estimate as ai_guess', () => {
    const entries = itemsToEntries([RICE, DRESSING], 'lunch');

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      meal_type: 'lunch',
      source: 'photo',
      food_name: 'Steamed rice',
      portion_g: 150,
      calories: 205,
      protein_g: 4,
      carbs_g: 45,
      fat_g: 1,
      ai_guess: {
        name: 'Steamed rice',
        portion_grams: 150,
        est_calories: 205,
        est_protein_g: 4,
        est_carbs_g: 45,
        est_fat_g: 1,
        confidence: 0.92,
      },
    });
    expect(entries[1].food_name).toBe('Dressing');
    expect(entries[1].calories).toBe(135);
  });

  it('tags every entry with the given meal type and photo source', () => {
    const entries = itemsToEntries([RICE, DRESSING, GREENS], 'dinner');
    expect(entries.every((entry) => entry.meal_type === 'dinner')).toBe(true);
    expect(entries.every((entry) => entry.source === 'photo')).toBe(true);
  });
});
