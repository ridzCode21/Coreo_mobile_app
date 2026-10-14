/**
 * Issue #19 — the "Reading you" card needs real connected-source data from
 * `GET /integrations/sources/` (`apps/integrations/urls.py:8`, view
 * `apps/integrations/views.py:17-19`, `apps/integrations/source_status.py:9-46`). The backend wraps
 * the three-record list (`apple_health`, `health_connect`, `strava` — `DeviceSync.Source` choices
 * `apps/integrations/models.py:33-35`, plus the literal `"strava"` string) in its own envelope,
 * `{"success": true, "sources": [...]}` — not Style A's `data` wrapper. No device-connect flow
 * exists in the app yet (see plan.md Decision log #2 / blocked.txt), so the mock always returns all
 * three disconnected, exactly like a fresh real account with no `DeviceSync`/`StravaConnection` rows.
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

  it('returns exactly 3 disconnected records in the backend envelope shape, no counts', async () => {
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
      }[];
    };
    expect(body.success).toBe(true);
    expect(body.sources).toHaveLength(3);
    expect(body.sources.map((s) => s.source)).toEqual(['apple_health', 'health_connect', 'strava']);
    for (const record of body.sources) {
      expect(record.connected).toBe(false);
      expect(record.last_synced_at).toBeNull();
      expect(record.synced_through).toBeNull();
    }
  });
});
