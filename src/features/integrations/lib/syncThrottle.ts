/** Don't sync on every focus; a sync reads several days of records. */
const MIN_MINUTES_BETWEEN_SYNCS = 15;
/** After a failed try (offline, server down) come back sooner, but not so soon a dead server is hammered. */
const MIN_MINUTES_AFTER_FAILURE = 1;

/**
 * True when enough time has passed since the last attempt. A last attempt that looks like it is in
 * the future (the clock was set backwards) or cannot be read counts as due, so a wrong clock can
 * never stop syncing for months.
 */
export function isSyncDue(
  lastAttemptAt: string | null,
  now: number,
  lastAttemptFailed = false,
): boolean {
  if (lastAttemptAt === null) return true;
  const minutes = (now - Date.parse(lastAttemptAt)) / 60_000;
  if (!Number.isFinite(minutes) || minutes < 0) return true;
  return minutes >= (lastAttemptFailed ? MIN_MINUTES_AFTER_FAILURE : MIN_MINUTES_BETWEEN_SYNCS);
}
