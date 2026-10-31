import type { DeviceDailyLog } from '@/features/integrations/lib/types';

/** One local day of raw records, already converted to the backend's units by the platform reader. */
export type DayRecords = {
  date: string;
  steps: number | null;
  /** Time actually asleep. Overlaps (two apps recording one night) are merged here. */
  sleepIntervals: { start: string; end: string }[];
  weightsKg: { time: string; kg: number }[];
  /** HRV in milliseconds. */
  hrvMillis: number[];
  workouts: { type: string; start: string; end: string }[];
};

const MAX_SLEEP_HOURS = 24; // the backend rejects more; a night that long is a tracker left running
const MAX_WORKOUT_SECONDS = 24 * 3600; // a session longer than a day is a timer left running
// Defensive limits against bad data written by other apps (a 0 kg weight, a billion steps). They
// are not medical thresholds: anything outside is dropped, and the server keeps its old value.
const MAX_STEPS_PER_DAY = 200_000;
// A 1 kg floor also catches an app that wrote grams into a kilogram field (81.5 g reads as 0.08 kg).
const MIN_WEIGHT_KG = 1;
const MAX_WEIGHT_KG = 700;
const MAX_HRV_MILLIS = 1000;

const isBetween = (value: number, max: number, min = Number.MIN_VALUE) =>
  Number.isFinite(value) && value >= min && value <= max;

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function mergedSleepHours(intervals: DayRecords['sleepIntervals']): number {
  const spans = intervals
    .map(({ start, end }) => [Date.parse(start), Date.parse(end)] as const)
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0]);

  let totalMs = 0;
  let currentEnd = -Infinity;
  for (const [start, end] of spans) {
    const from = Math.max(start, currentEnd);
    if (end > from) totalMs += end - from;
    currentEnd = Math.max(currentEnd, end);
  }
  return totalMs / 3_600_000;
}

type Span = { type: string; start: number; end: number };

/** The same workout written by two apps: same type, and they overlap by at least half. */
function isSameWorkout(a: Span, b: Span): boolean {
  if (a.type.toLowerCase() !== b.type.toLowerCase()) return false;
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  return overlap > 0 && overlap >= 0.5 * Math.min(a.end - a.start, b.end - b.start);
}

function workoutSessions(workouts: DayRecords['workouts']): DeviceDailyLog['workout_sessions'] {
  const kept: Span[] = [];
  for (const workout of workouts) {
    const span = {
      type: workout.type,
      start: Date.parse(workout.start),
      end: Date.parse(workout.end),
    };
    if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.end <= span.start)
      continue;
    if ((span.end - span.start) / 1000 > MAX_WORKOUT_SECONDS) continue;
    const twin = kept.findIndex((other) => isSameWorkout(other, span));
    if (twin === -1) kept.push(span);
    else if (span.end - span.start > kept[twin].end - kept[twin].start) kept[twin] = span;
  }
  return kept
    .map((span) => ({
      type: span.type,
      duration_seconds: Math.round((span.end - span.start) / 1000),
    }))
    .filter((session) => session.duration_seconds > 0);
}

/** One day → one `daily_logs` row, or null when there is nothing to send for that day. */
export function mapDay(records: DayRecords): DeviceDailyLog | null {
  const log: DeviceDailyLog = {
    date: records.date,
    workout_sessions: workoutSessions(records.workouts),
  };

  if (records.steps !== null && isBetween(records.steps, MAX_STEPS_PER_DAY)) {
    log.steps = Math.round(records.steps);
  }

  const sleepHours = mergedSleepHours(records.sleepIntervals);
  if (sleepHours > 0 && sleepHours <= MAX_SLEEP_HOURS) log.sleep_hours = round(sleepHours, 2);

  const weights = records.weightsKg.filter((weight) =>
    isBetween(weight.kg, MAX_WEIGHT_KG, MIN_WEIGHT_KG),
  );
  if (weights.length > 0) {
    const byTime = [...weights].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    log.weight_kg = round(byTime[byTime.length - 1].kg, 2);
  }

  const hrv = records.hrvMillis.filter((value) => isBetween(value, MAX_HRV_MILLIS));
  if (hrv.length > 0) {
    log.hrv = round(hrv.reduce((sum, value) => sum + value, 0) / hrv.length, 1);
  }

  const hasData =
    log.steps !== undefined ||
    log.sleep_hours !== undefined ||
    log.weight_kg !== undefined ||
    log.hrv !== undefined ||
    log.workout_sessions.length > 0;
  return hasData ? log : null;
}
