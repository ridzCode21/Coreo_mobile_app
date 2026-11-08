import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

const PKCE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validationError(details: Record<string, string[]>) {
  return { status: 400, body: styleAError('VALIDATION_ERROR', 'Invalid request data', details) };
}

registerMock('POST', '/integrations/strava/exchange/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  const body = isRecord(request.body) ? request.body : {};
  if (typeof body.code !== 'string' || !body.code.trim()) {
    return validationError({ code: ['This field is required.'] });
  }
  if (typeof body.code_verifier !== 'string' || !PKCE_VERIFIER.test(body.code_verifier.trim())) {
    return validationError({ code_verifier: ['Invalid code verifier.'] });
  }
  if (body.code === 'strava-mock-deny') {
    return {
      status: 400,
      body: styleAError(
        'STRAVA_AUTH_FAILED',
        'Strava authorization failed. Please try connecting again.',
      ),
    };
  }
  if (body.code === 'strava-mock-not-configured') {
    return { status: 503, body: styleAError('STRAVA_NOT_CONFIGURED', 'Strava is not configured') };
  }

  const athleteId = 1;
  mockDb.stravaConnections[user.id] = { athleteId, lastSyncedAt: new Date().toISOString() };
  return { status: 200, body: { success: true, athlete_id: athleteId, activities_imported: 0 } };
});
