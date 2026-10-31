/** Wire shapes for `POST /insights/import/` (backend docs §19), plus the sources the app can read. */
export type DeviceSource = 'apple_health' | 'health_connect';

export type WorkoutSession = {
  type: string;
  duration_seconds: number;
};

/** One local day. Every field except `date` is left out when the phone has nothing for it: the
 * server keeps its old value for a missing field and replaces it for a present one. */
export type DeviceDailyLog = {
  date: string; // YYYY-MM-DD in the phone's local time
  steps?: number;
  weight_kg?: number;
  sleep_hours?: number;
  hrv?: number;
  workout_sessions: WorkoutSession[];
};
