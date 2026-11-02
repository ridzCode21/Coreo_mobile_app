/**
 * Issue #172 — the mock `POST /users/token/refresh/` returned `{ access }` only (no `refresh`),
 * so nothing in the mock could show the real backend's rotation behaviour (backend #106/#107,
 * `apps/users/api/views/auth.py:207-233`): a new `refresh` on every successful refresh, and a 400
 * `TOKEN_REFRESH_ERROR` if the same refresh token is presented again. This locks in both: the
 * envelope now carries a new `refresh`, and reusing a refresh token that already produced a new
 * pair is rejected exactly like an invalid one.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair, __resetMockTokensForTests } from '@/shared/api/mock/tokens';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';

type RefreshEnvelope = {
  success: boolean;
  data?: { access?: string; refresh?: string };
  error?: { code?: string; message?: string };
};

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'refresh-user-1',
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

async function callRefresh(refresh: string): Promise<{ status: number; body: RefreshEnvelope }> {
  const match = resolveMock('POST', '/users/token/refresh/');
  if (!match) throw new Error('POST /users/token/refresh/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/users/token/refresh/',
    params: match.params,
    query: {},
    headers: {},
    body: { refresh },
  };
  return (await match.handler(request)) as MockResponse & { body: RefreshEnvelope };
}

describe('auth mock: POST /users/token/refresh/ rotation (issue #172)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
    __resetMockTokensForTests();
  });

  it('returns a new access token and a new refresh token', async () => {
    const user = seedUser();
    const { refresh } = issueTokenPair({ id: user.id, email: user.email });

    const response = await callRefresh(refresh);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data?.access).toBe('string');
    expect(typeof response.body.data?.refresh).toBe('string');
    expect(response.body.data?.refresh).not.toBe(refresh);
  });

  it('lets a second, different refresh succeed after the first rotation', async () => {
    const user = seedUser();
    const { refresh: firstRefresh } = issueTokenPair({ id: user.id, email: user.email });

    const firstResponse = await callRefresh(firstRefresh);
    const secondRefresh = firstResponse.body.data?.refresh as string;

    const secondResponse = await callRefresh(secondRefresh);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data?.refresh).not.toBe(secondRefresh);
  });

  it('rejects reusing a refresh token that has already produced a new pair', async () => {
    const user = seedUser();
    const { refresh } = issueTokenPair({ id: user.id, email: user.email });

    const firstResponse = await callRefresh(refresh);
    expect(firstResponse.status).toBe(200);

    const secondResponse = await callRefresh(refresh);

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body.success).toBe(false);
    expect(secondResponse.body.error?.code).toBe('TOKEN_REFRESH_ERROR');
  });
});
