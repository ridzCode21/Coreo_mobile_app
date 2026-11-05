import { ApiError } from '@/shared/api/errors';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function fieldErrorsFromRecord(value: unknown): Record<string, string[]> | null {
  if (!value || typeof value !== 'object') return null;

  const result: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isStringArray(entry)) result[key] = entry;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Extracts Style A validation details from POST /users/password-change/. */
export function changePasswordFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return null;
  }
  const body = error.details as { error?: { details?: unknown }; details?: unknown };
  return fieldErrorsFromRecord(body.error?.details) ?? fieldErrorsFromRecord(body.details) ?? null;
}
