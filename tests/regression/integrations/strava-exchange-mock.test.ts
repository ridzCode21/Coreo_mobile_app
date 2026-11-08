/**
 * Issue #56 — mock for the real `POST /integrations/strava/exchange/`
 * (`apps/integrations/urls.py:9`, view `apps/integrations/views.py:53-77`, serializer
 * `apps/integrations/serializers.py:12-19`). The real route: validates `code` (required) and
 * `code_verifier` (43-128 chars, unreserved PKCE charset) with a 400 `VALIDATION_ERROR`; forwards to
 * Strava and maps a token-exchange failure to 400 `STRAVA_AUTH_FAILED`
 * (`apps/integrations/services.py:25-36`, `strava_api.py`); returns a bare-ish
 * `{success, athlete_id, activities_imported}` on success. `GET /integrations/sources/`
 * (`source_status.py:38-44`) must then report `strava` connected with a `last_synced_at`, exactly
 * like a real `StravaConnection` row — this is the one case where the sources mock DOES flip state,
 * unlike the device-sync sources which intentionally always report disconnected
 * (`home/mocks/sources.handlers.ts` comment, issue #19).
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'strava-user-1',
    email: 'rae@example.com',
    password: 'unused',
    first_name: 'Rae',
    last_name: 'Kim',
    phone: null,
    date_of_birth: null,
    gender: null,
    timezone: 'UTC',
    is_premium: false,
    email_verified: true,
    phone_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
  mockDb.users.push(user);
  return user;
}

function request(overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>) {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

const VALID_VERIFIER = 'a'.repeat(43);

async function callExchange(body: unknown, token?: string) {
  const match = resolveMock('POST', '/integrations/strava/exchange/');
  if (!match) throw new Error('POST /integrations/strava/exchange/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/integrations/strava/exchange/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
}

async function callSources(token: string) {
  const match = resolveMock('GET', '/integrations/sources/');
  if (!match) throw new Error('GET /integrations/sources/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/integrations/sources/',
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

describe('integrations mock: POST /integrations/strava/exchange/ (issue #56)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('POST', '/integrations/strava/exchange/')).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    const response = await callExchange({ code: 'x', code_verifier: VALID_VERIFIER });
    expect(response.status).toBe(401);
  });

  it('rejects a missing code with 400 VALIDATION_ERROR', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const response = await callExchange({ code_verifier: VALID_VERIFIER }, access);
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a code_verifier shorter than 43 characters with 400 VALIDATION_ERROR', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const response = await callExchange({ code: 'abc', code_verifier: 'short' }, access);
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a code_verifier with characters outside the PKCE charset', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const response = await callExchange(
      { code: 'abc', code_verifier: `${'a'.repeat(42)}!` },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('simulates a Strava-side auth failure for the deterministic deny code', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const response = await callExchange(
      { code: 'strava-mock-deny', code_verifier: VALID_VERIFIER },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('STRAVA_AUTH_FAILED');
  });

  it('simulates Strava not being configured for the deterministic trigger code', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const response = await callExchange(
      { code: 'strava-mock-not-configured', code_verifier: VALID_VERIFIER },
      access,
    );
    expect(response.status).toBe(503);
    expect((response.body as { error: { code: string } }).error.code).toBe('STRAVA_NOT_CONFIGURED');
  });

  it('connects on a valid code/verifier and flips the sources record to connected', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const before = await callSources(access);
    const stravaBefore = (
      before.body as { sources: { source: string; connected: boolean }[] }
    ).sources.find((s) => s.source === 'strava');
    expect(stravaBefore?.connected).toBe(false);

    const response = await callExchange({ code: 'abc123', code_verifier: VALID_VERIFIER }, access);
    expect(response.status).toBe(200);
    const body = response.body as {
      success: boolean;
      athlete_id: number;
      activities_imported: number;
    };
    expect(body.success).toBe(true);
    expect(typeof body.athlete_id).toBe('number');
    expect(typeof body.activities_imported).toBe('number');

    const after = await callSources(access);
    const stravaAfter = (
      after.body as {
        sources: { source: string; connected: boolean; last_synced_at: string | null }[];
      }
    ).sources.find((s) => s.source === 'strava');
    expect(stravaAfter?.connected).toBe(true);
    expect(stravaAfter?.last_synced_at).not.toBeNull();
  });
});
