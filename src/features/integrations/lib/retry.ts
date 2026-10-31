import { ApiError } from '@/shared/api/errors';

const MAX_RETRIES = 3;
const MAX_DELAY_MS = 15_000;

/** A rejected session or an invalid payload will not get better by waiting. Re-sending a day is
 * safe (the server replaces it), so everything else is retried a few times. */
export function shouldRetryImport(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.kind === 'unauthorized' || error.kind === 'validation')) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, MAX_DELAY_MS);
}
