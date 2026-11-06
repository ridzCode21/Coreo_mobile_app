/**
 * Issue #179 — mock for `GET /core/config/`, matching the real backend code exactly:
 * `apps/core/urls.py:15`, `apps/core/views.py:154-166` (`client_config`). No
 * `@permission_classes` override, so it uses the project default `IsAuthenticated`
 * (med_app/settings.py:139-141). The response nests the URLs two levels deep:
 * `data.config.settings.terms_url` / `.privacy_policy_url` — not `data.terms_url`. The backend
 * currently returns placeholder addresses (`https://med_app.com/terms`,
 * `https://med_app.com/privacy`, views.py:160-164); the mock must mirror those exact placeholders,
 * not invent real ones (issue text: "Real addresses must be set on the backend before release").
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'config-user-1',
    email: 'ari@example.com',
    password: 'correct-horse-battery',
    first_name: 'Ari',
    last_name: 'Nguyen',
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
  return { params: {}, query: {}, headers: {}, body: undefined, ...overrides };
}

function call(path: string, token?: string) {
  const match = resolveMock('GET', path);
  if (!match) throw new Error(`GET ${path} is not registered`);
  return match.handler(
    request({ method: 'GET', path, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  );
}

describe('profile mocks: GET /core/config/ (issue #179, views.py:154-166)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns 401 with no token', async () => {
    const response = await call('/core/config/');
    expect(response.status).toBe(401);
  });

  it('returns the nested data.config.settings shape with the placeholder legal URLs', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call('/core/config/', access);

    expect(response.status).toBe(200);
    const body = response.body as {
      success: true;
      data: { config: { settings: { terms_url: string; privacy_policy_url: string } } };
    };
    expect(body.success).toBe(true);
    expect(body.data.config.settings.terms_url).toBe('https://med_app.com/terms');
    expect(body.data.config.settings.privacy_policy_url).toBe('https://med_app.com/privacy');
  });
});
