/**
 * Issue #138 — backend contract for GET /meal-plans/{date}/. The detail response includes
 * `quota: plan_quota(request.user)` (backend apps/meals/views.py). The API reference is the
 * authoritative contract documentation; this suite protects the bare Style-B response and tiers.
 */
import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MealPlanDetail, PlanQuota } from '@/shared/types/mealPlan';
import { parseMealPlanDetailResponse } from '@/features/nutrition/schemas';

function requireQuota(response: { quota?: PlanQuota }): PlanQuota {
  if (!response.quota) throw new Error('Successful meal-plan detail response must include quota');
  return response.quota;
}

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'quota-user',
    email: 'quota@example.com',
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
  return match.handler(request) as Promise<{ status: number; body: MealPlanDetail }>;
}

describe('nutrition mock contract: GET /meal-plans/:date/ quota (issue #138)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns the free-tier plan-generate usage after creating a plan', async () => {
    const { access } = issueTokenPair(seedUser());
    const date = '2026-10-30';
    await callRoute('POST', '/meal-plans/', access, { date });

    const response = await callRoute('GET', `/meal-plans/${date}/`, access);
    const quota = requireQuota(response.body);

    expect(response.status).toBe(200);
    expect(quota).toMatchObject({
      tier: 'free',
      plan_generate: { limit: 2, used: 1, remaining: 1 },
      plan_regenerate: { limit: 2, used: 0, remaining: 2 },
    });
    expect(quota.quota_resets_at).toEqual(expect.any(String));
  });

  it('uses the premium tier’s real limit and remaining count', async () => {
    const user = seedUser({ id: 'premium-user', email: 'premium@example.com', is_premium: true });
    const { access } = issueTokenPair(user);
    const date = '2026-10-30';
    await callRoute('POST', '/meal-plans/', access, { date });

    const response = await callRoute('GET', `/meal-plans/${date}/`, access);
    const quota = requireQuota(response.body);

    expect(quota.plan_generate).toEqual({ limit: 5, used: 1, remaining: 4 });
  });

  it('shares plan-generate usage across target plan dates and preserves idempotency', async () => {
    const { access } = issueTokenPair(seedUser({ id: 'shared-user', email: 'shared@example.com' }));
    await callRoute('POST', '/meal-plans/', access, { date: '2026-10-30' });
    await callRoute('POST', '/meal-plans/', access, { date: '2026-10-30' });
    await callRoute('POST', '/meal-plans/', access, { date: '2026-10-31' });

    const response = await callRoute('GET', '/meal-plans/2026-10-30/', access);
    const quota = requireQuota(response.body);

    // quota.py keys usage to the account's current local day, not plan date.
    expect(quota.plan_generate).toEqual({ limit: 2, used: 2, remaining: 0 });
  });

  it('keeps a valid plan available when an optional quota payload is malformed', () => {
    const detail = parseMealPlanDetailResponse({
      id: 138,
      status: 'ready',
      quota: { tier: 'enterprise' },
    });

    expect(detail).toMatchObject({ id: 138, status: 'ready' });
    expect(detail.quota).toBeUndefined();
  });
});
