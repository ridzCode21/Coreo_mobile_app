import {
  addDays,
  daysBetween,
  isDateString,
  toLocalDateString,
} from '@/features/integrations/lib/dates';

/** First sync: Health Connect only lets an app read 30 days before its first permission grant. */
export const BACKFILL_DAYS = 30;
/** Watches upload late, so a sync re-reads the last couple of finished days too. */
export const LOOKBACK_DAYS = 2;
/** After a long gap, don't read a whole year one day at a time. */
export const MAX_WINDOW_DAYS = 60;

type SyncWindowInput = {
  today: Date;
  /** Local `YYYY-MM-DD` of the last finished sync, or null before the first one. */
  syncedThrough: string | null;
};

/** The local days to read, oldest first, always ending today. */
export function syncWindow({ today, syncedThrough }: SyncWindowInput): string[] {
  const end = toLocalDateString(today);
  const earliest = addDays(end, -MAX_WINDOW_DAYS);
  // A saved cursor that is not a real date is treated as no cursor: better a full backfill than a
  // window computed from garbage.
  const saved = syncedThrough !== null && isDateString(syncedThrough) ? syncedThrough : null;
  // A cursor ahead of today (the clock was ahead, or the person crossed the date line) can't have
  // covered days that haven't happened here yet: treat it as today so the lookback still applies.
  const cursor = saved !== null && saved > end ? end : saved;
  let start = cursor === null ? addDays(end, -BACKFILL_DAYS) : addDays(cursor, -LOOKBACK_DAYS);
  if (start < earliest) start = earliest;

  const days: string[] = [];
  for (let offset = 0; offset <= daysBetween(start, end); offset += 1) {
    days.push(addDays(start, offset));
  }
  return days;
}
