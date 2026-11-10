/**
 * Issue #58 — mock for the real `POST /integrations/strava/disconnect/`
 * (`apps/integrations/urls.py:11`, view `apps/integrations/views.py:99-109`, service
 * `apps/integrations/services.py:58` `disconnect_strava`). The real route: requires auth (401
 * with no/invalid token); 404 `NOT_FOUND` "Strava is not connected" when there is no
 * `StravaConnection` row (`views.py:116-117`); on success deletes the connection and returns a
 * bare `{success: true, message: "Strava disconnected"}` (`views.py:109`), after which
 * `GET /integrations/sources/` must report `strava` disconnected again
 * (`source_status.py:51-58` — `_strava_record` returns `connected: false` once no row exists).
 * Mirrors `strava-exchange-mock.test.ts`'s structure for the opposite direction of the same
 * connection lifecycle.
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

async function callDisconnect(token?: string) {
  const match = resolveMock('POST', '/integrations/strava/disconnect/');
  if (!match) throw new Error('POST /integrations/strava/disconnect/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/integrations/strava/disconnect/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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

describe('integrations mock: POST /integrations/strava/disconnect/ (issue #58)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('POST', '/integrations/strava/disconnect/')).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    const response = await callDisconnect();
    expect(response.status).toBe(401);
  });

  it('returns 404 NOT_FOUND when Strava was never connected', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callDisconnect(access);

    expect(response.status).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('disconnects a connected athlete and flips the sources record back to disconnected', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    mockDb.stravaConnections[user.id] = { athleteId: 1, lastSyncedAt: new Date().toISOString() };

    const before = await callSources(access);
    const stravaBefore = (
      before.body as { sources: { source: string; connected: boolean }[] }
    ).sources.find((s) => s.source === 'strava');
    expect(stravaBefore?.connected).toBe(true);

    const response = await callDisconnect(access);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Strava disconnected' });

    const after = await callSources(access);
    const stravaAfter = (
      after.body as { sources: { source: string; connected: boolean }[] }
    ).sources.find((s) => s.source === 'strava');
    expect(stravaAfter?.connected).toBe(false);
  });

  it("disconnecting one user never touches another user's connection", async () => {
    const userA = seedUser({ id: 'strava-user-a', email: 'a@example.com' });
    const userB = seedUser({ id: 'strava-user-b', email: 'b@example.com' });
    const { access: accessA } = issueTokenPair(userA);
    const { access: accessB } = issueTokenPair(userB);
    mockDb.stravaConnections[userA.id] = { athleteId: 1, lastSyncedAt: new Date().toISOString() };
    mockDb.stravaConnections[userB.id] = { athleteId: 2, lastSyncedAt: new Date().toISOString() };

    await callDisconnect(accessA);

    const afterB = await callSources(accessB);
    const stravaB = (
      afterB.body as { sources: { source: string; connected: boolean }[] }
    ).sources.find((s) => s.source === 'strava');
    expect(stravaB?.connected).toBe(true);
  });
});
