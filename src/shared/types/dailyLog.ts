/**
 * Daily-summary shapes — mirror `API_REFERENCE.md` §10 exactly. `DailyLog` is a read-only daily
 * aggregate the backend recomputes as entries change; `DailySummary` is the `GET /daily-summary/`
 * payload. Nutrition Layer 1 drives the Diet home card from `food/entries` + diet-profile targets
 * (design spec §6, F-N5); the full daily-summary wiring (net calories, exercise) lands with Layer 2.
 */

import type { FoodEntry } from '@/shared/types/food';

/** Read-only daily aggregate — §10 `<DailyLog>`. */
export type DailyLog = {
  id: number;
  date: string;
  calories_in: number;
  calories_out: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  steps: number;
  weight_kg: number | null;
  sleep_hours: number | null;
  hrv: number | null;
  source: string;
  workout_sessions: number;
};

/** `GET /daily-summary/` payload — §10. `exercise_entries` is typed by the fitness feature (Phase 6). */
export type DailySummary = {
  daily_log: DailyLog;
  net_calories: number;
  food_log_count: number;
  food_entries: FoodEntry[];
  exercise_entries: unknown[];
};
