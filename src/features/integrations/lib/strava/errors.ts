import { ApiError } from '@/shared/api/errors';

type ErrorBody = { error?: { code?: unknown } };

export function stravaConnectErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null) {
    return null;
  }
  const code = (error.details as ErrorBody).error?.code;
  return typeof code === 'string' ? code : null;
}

export function stravaConnectErrorMessage(code: string | null): string {
  if (code === 'STRAVA_AUTH_FAILED') {
    return 'Strava authorization failed. Please try connecting again.';
  }
  if (code === 'STRAVA_NOT_CONFIGURED') return 'Strava is not configured';
  return 'Could not connect to Strava. Try again.';
}
