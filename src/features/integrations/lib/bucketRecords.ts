import type { DayRecords } from '@/features/integrations/lib/dayTotals';
import { toLocalDateString } from '@/features/integrations/lib/dates';

/** What a platform reader pulled for the whole window, before it is split into local days. */
export type WindowRecords = {
  stepsByDate: Record<string, number>;
  sleepSessions: { start: string; end: string; asleep: { start: string; end: string }[] }[];
  weights: { time: string; kg: number }[];
  hrv: { time: string; millis: number }[];
  workouts: { type: string; start: string; end: string }[];
};

const localDate = (iso: string) => toLocalDateString(new Date(iso));

/**
 * Splits window-wide records into one `DayRecords` per requested local day. A night belongs to the
 * day you woke up, and a workout to the day it started, so nothing is counted on two days.
 */
export function bucketRecords(dates: string[], records: WindowRecords): DayRecords[] {
  const byDate = new Map<string, DayRecords>(
    dates.map((date) => [
      date,
      {
        date,
        steps: records.stepsByDate[date] ?? null,
        sleepIntervals: [],
        weightsKg: [],
        hrvMillis: [],
        workouts: [],
      },
    ]),
  );

  for (const session of records.sleepSessions) {
    const day = byDate.get(localDate(session.end));
    if (day) day.sleepIntervals.push(...session.asleep);
  }
  for (const weight of records.weights) {
    byDate.get(localDate(weight.time))?.weightsKg.push({ time: weight.time, kg: weight.kg });
  }
  for (const sample of records.hrv) {
    byDate.get(localDate(sample.time))?.hrvMillis.push(sample.millis);
  }
  for (const workout of records.workouts) {
    byDate.get(localDate(workout.start))?.workouts.push(workout);
  }
  return dates.map((date) => byDate.get(date) as DayRecords);
}
