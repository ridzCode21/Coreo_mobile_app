import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const DATE = '2026-10-16';

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'failed-retry-user',
    email: 'failed-retry@example.com',
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

function createPlan(token: string) {
  const match = resolveMock('POST', '/meal-plans/');
  if (!match) throw new Error('POST /meal-plans/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/meal-plans/',
    params: match.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body: { date: DATE },
  };
  return match.handler(request);
}

describe('nutrition mock: retrying a failed meal plan (issue #31)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('starts a fresh pending attempt without consuming another generation quota', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await createPlan(access);
    const key = `${user.id}:${DATE}`;
    const quotaKey = `plan_generate:${user.id}:${new Date().toISOString().slice(0, 10)}`;
    const firstPlanId = mockDb.mealPlans[key].id;
    mockDb.mealPlans[key].status = 'failed';

    const response = await createPlan(access);

    expect(response.status).toBe(202);
    expect(mockDb.mealPlans[key].status).toBe('pending');
    expect(mockDb.mealPlans[key].id).not.toBe(firstPlanId);
    expect(mockDb.mealPlanPollCounts[key]).toBe(0);
    expect(mockDb.quotaCounters[quotaKey]).toBe(1);
  });
});
