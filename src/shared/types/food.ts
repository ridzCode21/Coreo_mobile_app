/**
 * Food-domain shapes — mirror `API_REFERENCE.md` §8 (food tracking) + §17 (enums) exactly so the
 * mock and the eventual live API are structurally identical (swapping `EXPO_PUBLIC_API_MODE` to
 * `live` is a no-op for feature code). Lives in `shared/` because it's consumed by the nutrition
 * feature today and profile/insights later.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'photo' | 'barcode' | 'manual' | 'import' | 'plan';

/** A logged food entry — API_REFERENCE.md §8 `<FoodEntry>`. */
export type FoodEntry = {
  id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
  /** ISO timestamp. */
  created_at: string;
};

/** A food-database item, used by search + barcode lookup — §8 `<FoodItem>`. */
export type FoodItem = {
  id: number;
  barcode: string | null;
  name: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  /** e.g. `openfoodfacts`. */
  source: string;
  /** ISO timestamp. */
  last_fetched: string;
};

/** The day's running macro totals — §8 `GET /food/entries/` `macro_summary`. */
export type MacroSummary = {
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** Returned alongside a created entry — §8 `POST /food/entries/` `daily_totals`. */
export type DailyTotals = MacroSummary & {
  calories_out: number;
  net_calories: number;
};

/**
 * AI photo estimate — §8 `POST /food/photo/`. This is an ESTIMATE only; the frontend lets the
 * user confirm/edit it and then POSTs it as a real `FoodEntry`. It does not create an entry itself.
 */
export type PhotoEstimate = {
  name: string;
  portion_grams: number;
  est_calories: number;
  est_protein_g: number;
  est_carbs_g: number;
  est_fat_g: number;
};
