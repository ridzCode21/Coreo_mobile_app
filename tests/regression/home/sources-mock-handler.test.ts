/**
 * Issue #19 — the "Reading you" card needs real connected-source data from
 * `GET /integrations/sources/` (`apps/integrations/urls.py:8`, view
 * `apps/integrations/views.py:30-37`, `apps/integrations/source_status.py:9-70`). The backend wraps
 * the record list in its own envelope, `{"success": true, "sources": [...], "last_night": {...}}` —
 * not Style A's `data` wrapper. No device-connect flow exists in the app yet (see plan.md Decision
 * log #2 / blocked.txt), so the mock always returns every source disconnected, exactly like a fresh
 * real account with no `DeviceSync`/`StravaConnection`/`WearableConnection` rows.
 *
 * Updated for issue #48 round 2 (not weakened — corrected to match the backend's real current
 * shape): `source_status()` (`source_status.py:9-70`) unconditionally appends a `whoop` and `oura`
 * record to `sources` (iterating `WEARABLE_ORDER`, `source_status.py:30-31`) even though no in-app
 * flow connects them, and adds a `status` field per record. `views.py:30-37` also adds a top-level
 * `last_night` key (`apps/integrations/readings.py:26-36`). The old assertion of exactly 3 records
 * with no `status`/`last_night` no longer matches the backend and was breaking `useSourcesQuery`'s
 * Zod parse against this real shape (plan.md Decision log #4) — this test now locks in the corrected
 * 5-record shape instead.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'sources-user-1',
    email: 'asha@example.com',
    password: 'unused',
    first_name: 'Asha',
    last_name: 'Rao',
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

async function callSources(token?: string) {
  const match = resolveMock('GET', '/integrations/sources/');
  if (!match) throw new Error('GET /integrations/sources/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/integrations/sources/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

describe('home mock: GET /integrations/sources/ (issue #19)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('GET', '/integrations/sources/')).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    const response = await callSources();
    expect(response.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const response = await callSources('not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('returns exactly 5 disconnected records in the backend envelope shape, plus last_night, no counts', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callSources(access);
    expect(response.status).toBe(200);

    const body = response.body as {
      success: boolean;
      sources: {
        source: string;
        connected: boolean;
        last_synced_at: string | null;
        synced_through: string | null;
        status: string | null;
      }[];
      last_night: { sleep: unknown; recovery: unknown };
    };
    expect(body.success).toBe(true);
    expect(body.sources).toHaveLength(5);
    expect(body.sources.map((s) => s.source)).toEqual([
      'apple_health',
      'health_connect',
      'strava',
      'whoop',
      'oura',
    ]);
    for (const record of body.sources) {
      expect(record.connected).toBe(false);
      expect(record.last_synced_at).toBeNull();
      expect(record.synced_through).toBeNull();
      expect(record.status).toBeNull();
    }
    expect(body.last_night.sleep).toBeNull();
    expect(body.last_night.recovery).toBeNull();
  });
});
