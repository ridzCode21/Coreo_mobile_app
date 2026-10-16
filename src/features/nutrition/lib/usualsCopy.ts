import type { UsualsResponse } from '@/features/nutrition/schemas';

export type UsualsSuggestion = UsualsResponse['suggestions'][number];

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Formats the server-local ISO fields without reinterpreting them in the device timezone. */
export function formatUsualsHeadline(observedAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(observedAt);
  if (!match) return '';

  const [, year, month, day, hours, minutes] = match;
  const weekday =
    WEEKDAYS[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()];
  const hour = Number(hours) % 12 || 12;
  return `${hour}:${minutes} on a ${weekday}.`;
}

export function usualsRowCopy(suggestion: UsualsSuggestion): {
  title: string;
  subtitle: string;
} {
  if (suggestion.kind === 'yesterday') {
    return {
      title: suggestion.reason_label,
      subtitle: `${suggestion.food_name} · ${suggestion.calories} kcal`,
    };
  }

  return {
    title: suggestion.food_name,
    subtitle: `${suggestion.reason_label} · ${suggestion.calories} kcal`,
  };
}
