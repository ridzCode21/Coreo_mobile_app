const MINUTES_PER_DAY = 24 * 60;

export function dayProgress(now: Date): number {
  const elapsedMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.min(1, Math.max(0, elapsedMinutes / MINUTES_PER_DAY));
}
