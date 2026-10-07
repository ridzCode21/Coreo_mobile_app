/**
 * Seed data for the nutrition mock backend — a small, realistic food database (backing search +
 * barcode lookup) and a one-entry starter day so the Diet home isn't empty on first demo. Shapes
 * mirror `API_REFERENCE.md` §8 exactly. India-leaning items to match the design's sample meals
 * ("Two rotis, dal, and a lassi", "Rice bowl with paneer and greens").
 */

import type { FoodEntry, FoodItem } from '@/shared/types/food';

export const SEED_FOOD_ITEMS: FoodItem[] = [
  {
    id: 1,
    barcode: '8901234567890',
    name: 'Greek Yogurt',
    calories_per_100g: 59,
    protein_g_per_100g: 10,
    carbs_g_per_100g: 3.6,
    fat_g_per_100g: 0.4,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 2,
    barcode: '8900000000017',
    name: 'Paneer',
    calories_per_100g: 296,
    protein_g_per_100g: 18,
    carbs_g_per_100g: 3.4,
    fat_g_per_100g: 25,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 3,
    barcode: '8900000000024',
    name: 'Cooked Rice',
    calories_per_100g: 130,
    protein_g_per_100g: 2.7,
    carbs_g_per_100g: 28,
    fat_g_per_100g: 0.3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 4,
    barcode: '8900000000031',
    name: 'Toor Dal (cooked)',
    calories_per_100g: 121,
    protein_g_per_100g: 7,
    carbs_g_per_100g: 20,
    fat_g_per_100g: 0.4,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 5,
    barcode: '8900000000048',
    name: 'Banana',
    calories_per_100g: 89,
    protein_g_per_100g: 1.1,
    carbs_g_per_100g: 23,
    fat_g_per_100g: 0.3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 6,
    barcode: '8900000000055',
    name: 'Roti (whole wheat)',
    calories_per_100g: 297,
    protein_g_per_100g: 11,
    carbs_g_per_100g: 51,
    fat_g_per_100g: 7,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 7,
    barcode: '8900000000062',
    name: 'Mixed Greens (sautéed)',
    calories_per_100g: 60,
    protein_g_per_100g: 3,
    carbs_g_per_100g: 6,
    fat_g_per_100g: 3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 8,
    barcode: '8900000000079',
    name: 'Lassi (sweet)',
    calories_per_100g: 92,
    protein_g_per_100g: 3,
    carbs_g_per_100g: 14,
    fat_g_per_100g: 2.5,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 9,
    barcode: '8900000000086',
    name: 'Boiled Egg',
    calories_per_100g: 155,
    protein_g_per_100g: 13,
    carbs_g_per_100g: 1.1,
    fat_g_per_100g: 11,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 10,
    barcode: '8900000000093',
    name: 'Almonds',
    calories_per_100g: 579,
    protein_g_per_100g: 21,
    carbs_g_per_100g: 22,
    fat_g_per_100g: 50,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
];

/**
 * One breakfast entry so the Diet home shows real data on first open (not empty, not a full day).
 * `startId` is `mockDb.nextFoodEntryId`; the caller advances the counter by the number returned.
 */
export function starterDayEntries(date: string, startId: number): FoodEntry[] {
  return [
    {
      id: startId,
      date,
      meal_type: 'breakfast',
      food_name: 'Greek yogurt & banana',
      calories: 220,
      protein_g: 14,
      carbs_g: 34,
      fat_g: 3,
      source: 'manual',
      created_at: `${date}T08:15:00Z`,
    },
  ];
}
