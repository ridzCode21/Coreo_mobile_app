import { ApiError } from '@/shared/api/errors';

export const PREVIEW_TTL_MS = 600_000;

export function stripApproxPrefix(value: string): string {
  return value.startsWith('Approx. ') ? value.slice('Approx. '.length) : value;
}

export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

type MacroComparison = { calories_kcal: number; carbs_g: number };

export function deltaLine(original: MacroComparison, alternative: MacroComparison): string {
  const calorieDelta = Math.round(alternative.calories_kcal - original.calories_kcal);
  const carbDelta = Math.round(original.carbs_g - alternative.carbs_g);
  const calorieCopy = calorieDelta >= 0 ? `+${calorieDelta}` : String(calorieDelta);
  const carbCopy =
    carbDelta === 0
      ? 'same carbs'
      : `${Math.abs(carbDelta)}g ${carbDelta > 0 ? 'less' : 'more'} carbs`;
  return `${Math.round(alternative.calories_kcal)} kcal · ${calorieCopy} vs original · ${carbCopy}`;
}

function hasApiError(error: unknown, status: number, code: string): boolean {
  return (
    error instanceof ApiError &&
    error.status === status &&
    typeof error.details === 'object' &&
    error.details !== null &&
    'error' in error.details &&
    error.details.error === code
  );
}

export function previewNotFoundFrom(error: unknown): boolean {
  return hasApiError(error, 404, 'preview_not_found');
}

export function serviceUnavailableFrom(error: unknown): boolean {
  return hasApiError(error, 503, 'service_temporarily_unavailable');
}
