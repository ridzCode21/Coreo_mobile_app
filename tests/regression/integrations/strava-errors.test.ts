/**
 * Issue #56 — maps the real exchange endpoint's error codes
 * (`apps/integrations/views.py:69-77`: `STRAVA_AUTH_FAILED` 400, `STRAVA_NOT_CONFIGURED` 503, plus
 * the serializer's generic `VALIDATION_ERROR` 400) to copy the person can act on. Never invents a
 * code the backend doesn't send, and never shows a red/guilt-toned message (CLAUDE.md §"never red").
 */
import { ApiError } from '@/shared/api/errors';
import {
  stravaConnectErrorCode,
  stravaConnectErrorMessage,
} from '@/features/integrations/lib/strava/errors';

function apiErrorFor(status: number, code: string, message: string): ApiError {
  return ApiError.fromResponse(status, { success: false, error: { code, message } });
}

describe('stravaConnectErrorCode (issue #56, views.py:69-77)', () => {
  it('reads the backend error code off a validation/auth failure', () => {
    expect(
      stravaConnectErrorCode(
        apiErrorFor(
          400,
          'STRAVA_AUTH_FAILED',
          'Strava authorization failed. Please try connecting again.',
        ),
      ),
    ).toBe('STRAVA_AUTH_FAILED');
    expect(
      stravaConnectErrorCode(apiErrorFor(503, 'STRAVA_NOT_CONFIGURED', 'Strava is not configured')),
    ).toBe('STRAVA_NOT_CONFIGURED');
    expect(
      stravaConnectErrorCode(apiErrorFor(400, 'VALIDATION_ERROR', 'Invalid request data')),
    ).toBe('VALIDATION_ERROR');
  });

  it('returns null for a non-ApiError or a response with no error code', () => {
    expect(stravaConnectErrorCode(new Error('boom'))).toBeNull();
    expect(stravaConnectErrorCode(ApiError.network())).toBeNull();
  });
});

describe('stravaConnectErrorMessage (issue #56)', () => {
  it('matches the backend message for a failed authorization', () => {
    expect(stravaConnectErrorMessage('STRAVA_AUTH_FAILED')).toBe(
      'Strava authorization failed. Please try connecting again.',
    );
  });

  it('matches the backend message for Strava not being configured', () => {
    expect(stravaConnectErrorMessage('STRAVA_NOT_CONFIGURED')).toBe('Strava is not configured');
  });

  it('falls back to a calm, non-red generic message for anything else, including null', () => {
    expect(stravaConnectErrorMessage('VALIDATION_ERROR')).toBe(
      'Could not connect to Strava. Try again.',
    );
    expect(stravaConnectErrorMessage(null)).toBe('Could not connect to Strava. Try again.');
  });
});
