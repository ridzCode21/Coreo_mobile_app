/**
 * Food-domain shapes — mirror `API_REFERENCE.md` §8 (food tracking) + §17 (enums) exactly so the
 * mock and the eventual live API are structurally identical (swapping `EXPO_PUBLIC_API_MODE` to
 * `live` is a no-op for feature code). Lives in `shared/` because it's consumed by the nutrition
 * feature today and profile/insights later.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'photo' | 'barcode' | 'manual' | 'import' | 'quick_add' | 'label_ocr';

/** A logged food entry — API_REFERENCE.md §8 `<FoodEntry>`. */
export type FoodEntry = {
  id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  meal_type: MealType;
  food_item: number | null;
  food_name: string;
  portion_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource | 'plan';
  ai_guess: {
    name: string;
    portion_grams: number | null;
    est_calories: number;
    est_protein_g: number;
    est_carbs_g: number;
    est_fat_g: number;
    confidence: number;
  } | null;
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

export type MacroBudgetEntry = {
  consumed: number;
  target: number;
  remaining: number;
  over: boolean;
};

/** Exact `GET /food/entries/` macro shape from `apps.insights.services.build_macro_summary`. */
export type FoodEntriesMacroSummary = {
  calories: MacroBudgetEntry;
  protein_g: MacroBudgetEntry;
  carbs_g: MacroBudgetEntry;
  fat_g: MacroBudgetEntry;
};

/** Returned alongside a created entry — §8 `POST /food/entries/` `daily_totals`. */
export type DailyTotals = MacroSummary & {
  calories_out: number;
  net_calories: number;
};

export type AiGuess = {
  name: string;
  portion_grams: number | null;
  est_calories: number;
  est_protein_g: number;
  est_carbs_g: number;
  est_fat_g: number;
  confidence: number;
};

/** One recognized line item from `POST /food/photo/`. */
export type PhotoEstimateItem = Omit<AiGuess, 'portion_grams'> & {
  portion_label: string | null;
  portion_grams: number;
  guessed: boolean;
  guess_note: string | null;
  remembered: boolean;
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
  guessed_count: number;
  items: PhotoEstimateItem[];
};

/** A per-serving nutrition-label estimate — §8 `POST /food/label-ocr/`. */
export type LabelEstimate = Omit<PhotoEstimate, 'guessed_count' | 'items'> & {
  servings_per_container: number;
  confidence: number;
  guessed: boolean;
  guess_note: string | null;
  remembered: boolean;
};
