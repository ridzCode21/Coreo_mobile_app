/**
 * Issue #138 — backend contract for the no-plan GET /meal-plans/{date}/ 404. The real backend
 * (apps/meals/views.py:152-156) now returns `quota: plan_quota(request.user)` alongside the bare
 * Style-B `plan_not_found` error (closing vipin4250/Self_dev#82), so screen 28a's generate-quota
 * line can show real numbers before any plan exists for the day. The mock layer must match.
 */
import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { PlanQuota } from '@/shared/types/mealPlan';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'notfound-quota-user',
    email: 'notfound-quota@example.com',
    password: 'unused',
    first_name: 'Test',
    last_name: 'User',
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

async function callRoute(method: 'GET' | 'POST', path: string, token: string, body?: unknown) {
  const match = resolveMock(method, path);
  if (!match) throw new Error(`${method} ${path} is not registered`);
  const request: MockRequest = {
    method,
    path,
    params: match.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body,
  };
  return match.handler(request) as Promise<{
    status: number;
    body: { error: string; quota?: PlanQuota };
  }>;
}

describe('nutrition mock contract: GET /meal-plans/:date/ no-plan 404 quota (issue #138)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns the bare plan_not_found error with free-tier usage when no plan exists today', async () => {
    const { access } = issueTokenPair(seedUser());

    const response = await callRoute('GET', '/meal-plans/2026-10-30/', access);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('plan_not_found');
    if (!response.body.quota) throw new Error('404 plan_not_found response must include quota');
    expect(response.body.quota).toMatchObject({
      tier: 'free',
      plan_generate: { limit: 2, used: 0, remaining: 2 },
      plan_regenerate: { limit: 2, used: 0, remaining: 2 },
    });
    expect(response.body.quota.quota_resets_at).toEqual(expect.any(String));
  });

  it('reflects today’s already-spent generate usage even for a date with no plan', async () => {
    const { access } = issueTokenPair(
      seedUser({ id: 'notfound-used-user', email: 'notfound-used@example.com' }),
    );
    await callRoute('POST', '/meal-plans/', access, { date: '2026-10-29' });

    const response = await callRoute('GET', '/meal-plans/2026-10-30/', access);

    expect(response.body.quota?.plan_generate).toEqual({ limit: 2, used: 1, remaining: 1 });
  });

  it('uses the premium tier’s real limit on the no-plan 404', async () => {
    const { access } = issueTokenPair(
      seedUser({
        id: 'notfound-premium-user',
        email: 'notfound-premium@example.com',
        is_premium: true,
      }),
    );

    const response = await callRoute('GET', '/meal-plans/2026-10-30/', access);

    expect(response.body.quota?.plan_generate).toEqual({ limit: 5, used: 0, remaining: 5 });
  });
});
