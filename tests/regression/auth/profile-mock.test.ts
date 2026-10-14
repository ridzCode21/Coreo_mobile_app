/**
 * Issue #17 — the home greeting needs the signed-in user's first name. The backend already
 * returns it from login/register, but nothing in the app calls the dedicated profile endpoint, so
 * there's no way to re-fetch it on a fresh app open (session restored from SecureStore, not from a
 * fresh login response). Backend: `GET /api/v1/users/profile/` is auth-protected and wraps
 * `UserDetailSerializer` in a Style A envelope
 * (`/Users/Nuvo/Vipin/vipin/django_frontend/scripts/overnight/.state/refs/backend/apps/users/api/views/profile.py:28-33`,
 * `apps/users/urls.py:64`, serializer fields incl. `first_name`
 * `apps/users/serializers.py:546-566`). This test protects a matching mock handler.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'profile-user-1',
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

async function callProfile(token?: string) {
  const match = resolveMock('GET', '/users/profile/');
  if (!match) throw new Error('GET /users/profile/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/users/profile/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

describe('auth mock: GET /users/profile/ (issue #17)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('GET', '/users/profile/')).toBeDefined();
  });

  it('returns the signed-in user wrapped in the Style A envelope with first_name (profile.py:28-33)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callProfile(access);

    expect(response.status).toBe(200);
    const body = response.body as { success: boolean; data: { user: Record<string, unknown> } };
    expect(body.success).toBe(true);
    expect(body.data.user.first_name).toBe('Asha');
    expect(body.data.user.email).toBe('asha@example.com');
    // Mock-only fields never leak to the client.
    expect(body.data.user.password).toBeUndefined();
  });

  it('returns 401 with no token', async () => {
    const response = await callProfile();
    expect(response.status).toBe(401);
  });

  it('returns 401 for an unknown/invalid token', async () => {
    const response = await callProfile('not-a-real-token');
    expect(response.status).toBe(401);
  });

  describe('calibration fields (issue #19, serializers.py:551-620, calibration.py:25-40)', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 14));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('day 1: calibration_started_on today → dashed, not complete', async () => {
      const user = seedUser({ calibration_started_on: '2026-10-14' });
      const { access } = issueTokenPair(user);

      const response = await callProfile(access);
      const body = response.body as { data: { user: Record<string, unknown> } };
      expect(body.data.user.calibration_day).toBe(1);
      expect(body.data.user.calibration_complete).toBe(false);
      expect(body.data.user.wave).toBe('dashed');
    });

    it('day 4: calibration_started_on three days ago → solid, complete', async () => {
      const user = seedUser({ calibration_started_on: '2026-10-11' });
      const { access } = issueTokenPair(user);

      const response = await callProfile(access);
      const body = response.body as { data: { user: Record<string, unknown> } };
      expect(body.data.user.calibration_day).toBe(4);
      expect(body.data.user.calibration_complete).toBe(true);
      expect(body.data.user.wave).toBe('solid');
    });

    it('no calibration_started_on (pre-existing seeded user) defaults to already calibrated, not day 1', async () => {
      const user = seedUser();
      const { access } = issueTokenPair(user);

      const response = await callProfile(access);
      const body = response.body as { data: { user: Record<string, unknown> } };
      expect(body.data.user.calibration_day).toBeNull();
      expect(body.data.user.calibration_complete).toBe(true);
      expect(body.data.user.wave).toBe('solid');
    });
  });
});
