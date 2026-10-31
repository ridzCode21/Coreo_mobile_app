import { addDays, toLocalDateString } from '@/features/integrations/lib/dates';
import type { DeviceDailyLog } from '@/features/integrations/lib/types';

/** Backend limit is 366 days per request; stay well under it so one failure re-sends little. */
export const BATCH_SIZE = 90;

const NUMBER_FIELDS = ['steps', 'weight_kg', 'sleep_hours', 'hrv'] as const;

function cleaned(log: DeviceDailyLog): DeviceDailyLog {
  const row: DeviceDailyLog = { date: log.date, workout_sessions: log.workout_sessions };
  for (const field of NUMBER_FIELDS) {
    const value = log[field];
    if (value !== undefined && Number.isFinite(value) && value >= 0) row[field] = value;
  }
  return row;
}

/**
 * Rows → request-sized batches that satisfy the backend (no duplicate dates, nothing after
 * tomorrow, no negative numbers). With nothing to send it still returns one empty batch: an empty
 * batch is a valid sync and is what marks the source connected on the server.
 */
export function buildBatches(
  logs: DeviceDailyLog[],
  { today }: { today: Date },
): DeviceDailyLog[][] {
  const latestAllowed = addDays(toLocalDateString(today), 1);
  const byDate = new Map<string, DeviceDailyLog>();
  for (const log of logs) {
    if (log.date <= latestAllowed) byDate.set(log.date, cleaned(log));
  }

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length === 0) return [[]];

  const batches: DeviceDailyLog[][] = [];
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    batches.push(rows.slice(index, index + BATCH_SIZE));
  }
  return batches;
}
