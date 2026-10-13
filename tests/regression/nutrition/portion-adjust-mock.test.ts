/**
 * Issue #33 — the design's 36a screen explicitly adds "type your own amount" so the user can go
 * past the 0.25×–3× slider ("Same meal — half, double, or any amount you like."), and the real
 * backend only rejects a multiplier below 0.01 (`apps/meals/views.py:493-502`: `if multiplier <
 * 0.01: return 400`; `apps/meals/models.py:103-106` has no upper-bound validator or constraint —
 * only `MinValueValidator(0.01)`). The mock at
 * `src/features/nutrition/mocks/mealPlan.handlers.ts:486` invented an extra `multiplier > 3` cap
 * that the real API does not have, which would silently 400 any typed amount above 3× — exactly
 * the case this issue is about. This protects: the mock accepting any amount >= 0.01 (matching
 * the backend, not the old invented cap) and still rejecting anything below 0.01.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const DATE = '2026-10-13';

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'portion-user',
    email: 'portion@example.com',
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
  };
  mockDb.users.push(user);
  return user;
}

function callRoute(method: 'POST', path: string, token: string, body: unknown) {
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
  return match.handler(request);
}

describe('nutrition mock: POST /meal-plans/:date/meals/:mealId/adjust-quantity/ (issue #33)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('accepts an amount above 3x — the real backend has no upper bound (apps/meals/views.py:493-502)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });
    const meal = mockDb.mealPlans[`${user.id}:${DATE}`].meals[0];
    const baseCalories = meal.base_calories_kcal ?? meal.calories_kcal;

    const response = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${meal.id}/adjust-quantity/`,
      access,
      { portion_multiplier: 5 },
    );

    expect(response.status).toBe(200);
    expect((response.body as { calories_kcal: number }).calories_kcal).toBe(
      Math.round(baseCalories * 5),
    );
  });

  it('still rejects an amount below the backend minimum of 0.01', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });
    const meal = mockDb.mealPlans[`${user.id}:${DATE}`].meals[0];

    const response = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${meal.id}/adjust-quantity/`,
      access,
      { portion_multiplier: 0.001 },
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ error: 'invalid_portion_multiplier' }));
  });
});
