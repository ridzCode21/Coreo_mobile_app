/**
 * Issue #44 — mock handlers for the three new endpoints this screen's Account section calls,
 * matching the real backend code: `profile.user_data_export`, `profile.user_data_delete`,
 * `profile.user_account_delete` (`apps/users/api/views/profile.py:167-189`). Calls the handlers
 * directly (same pattern as `tests/regression/auth/profile-mock.test.ts`) — no component involved.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'account-user-1',
    email: 'priya@example.com',
    password: 'unused',
    first_name: 'Priya',
    last_name: 'Shah',
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

function call(method: 'GET' | 'DELETE', path: string, token?: string) {
  const match = resolveMock(method, path);
  if (!match) throw new Error(`${method} ${path} is not registered`);
  return match.handler(
    request({ method, path, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  );
}

describe('profile mocks: data export and delete (issue #44)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  describe('GET /users/me/data/export/ (profile.py:174-181)', () => {
    it("returns the account's own export payload for a valid token", async () => {
      const user = seedUser();
      const { access } = issueTokenPair(user);

      const response = await call('GET', '/users/me/data/export/', access);

      expect(response.status).toBe(200);
      const body = response.body as { schema_version: number; account: { id: string } };
      expect(body.schema_version).toBe(1);
      expect(body.account.id).toBe(user.id);
    });

    it('returns 401 with no token', async () => {
      const response = await call('GET', '/users/me/data/export/');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /users/me/data/ (profile.py:167-171) — keeps the account, clears health data', () => {
    it('clears the diet/fitness/wellness profile for that user and returns 204', async () => {
      const user = seedUser();
      const { access } = issueTokenPair(user);
      mockDb.dietProfiles[user.id] = { weight_kg: 78 } as never;
      mockDb.fitnessProfiles[user.id] = { fitness_goal: 'build_muscle' } as never;
      mockDb.wellnessProfiles[user.id] = { wellness_focus: 'racing_mind' } as never;

      const response = await call('DELETE', '/users/me/data/', access);

      expect(response.status).toBe(204);
      expect(mockDb.dietProfiles[user.id]).toBeUndefined();
      expect(mockDb.fitnessProfiles[user.id]).toBeUndefined();
      expect(mockDb.wellnessProfiles[user.id]).toBeUndefined();
      expect(mockDb.users.find((candidate) => candidate.id === user.id)).toBeDefined();
    });

    it('returns 401 with no token', async () => {
      const response = await call('DELETE', '/users/me/data/');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /users/me/ (profile.py:184-189) — removes the account entirely', () => {
    it('removes the user and invalidates their token, returning 204', async () => {
      const user = seedUser();
      const { access } = issueTokenPair(user);

      const response = await call('DELETE', '/users/me/', access);

      expect(response.status).toBe(204);
      expect(mockDb.users.find((candidate) => candidate.id === user.id)).toBeUndefined();

      const followUp = await call('GET', '/users/profile/', access);
      expect(followUp.status).toBe(401);
    });

    it('returns 401 with no token', async () => {
      const response = await call('DELETE', '/users/me/');
      expect(response.status).toBe(401);
    });
  });
});
