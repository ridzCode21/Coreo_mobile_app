const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` for a Date in the phone's local time zone. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Calendar-day arithmetic on `YYYY-MM-DD` strings is done at UTC noon so DST never shifts a day.
function utcNoon(dateString: string, plusDays = 0): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + plusDays, 12));
}

/** True only for a real calendar date written exactly as `YYYY-MM-DD`. */
export function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

export function addDays(dateString: string, days: number): string {
  const shifted = utcNoon(dateString, days);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utcNoon(to).getTime() - utcNoon(from).getTime()) / 86_400_000);
}
