/**
 * Issue #133 — mock for `GET /users/me/nudge/` (`apps/users/urls.py:57`, view
 * `apps/users/api/views/nudge.py:9-14`). Bare payload (no Style A wrapper — see
 * `nudge-api-contract.test.ts` docblock for the backend-code citation). Requires auth
 * (`@permission_classes([IsAuthenticated])`, `nudge.py:10`).
 *
 * The rule engine behind the real response (`apps/users/services/nudge_rules.py`: four rules,
 * cooldowns, evidence from fitness/diet/wellness profiles) is out of scope to port into the mock
 * for this issue — this follows the same precedent as `home/mocks/sources.handlers.ts`, which
 * always returns the single safe "everything disconnected" state rather than modeling every
 * backend-computed state (see plan.md Decision log). The mock therefore always returns the
 * calibration-safe empty state, `{ "nudge": null, "message": null }`, matching one of the three
 * real shapes exactly. `CoreoHomeScreen`'s "nudge card renders when present" behavior is covered
 * at the component level instead (`core-home-screen.test.tsx`), by mocking `useNudgeQuery`'s
 * return value directly, the same way that file already mocks `useDailySummaryQuery` etc.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'nudge-user-1',
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

async function callNudge(token?: string) {
  const match = resolveMock('GET', '/users/me/nudge/');
  if (!match) throw new Error('GET /users/me/nudge/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/users/me/nudge/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

describe('home mock: GET /users/me/nudge/ (issue #133)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('GET', '/users/me/nudge/')).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    const response = await callNudge();
    expect(response.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const response = await callNudge('not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('returns the bare, no-nudge shape for a signed-in user, with no Style A wrapper', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callNudge(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ nudge: null, message: null });
    expect(response.body).not.toHaveProperty('success');
    expect(response.body).not.toHaveProperty('data');
  });
});
