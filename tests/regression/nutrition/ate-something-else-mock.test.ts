import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const DATE = '2026-10-13';

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'ate-else-user',
    email: 'ate-else@example.com',
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

describe('nutrition mock: POST /meal-plans/:date/ate-something-else/', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('matches backend defaults when optional nutrition and description fields are omitted', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });
    const meal = mockDb.mealPlans[`${user.id}:${DATE}`].meals[0];

    const response = await callRoute('POST', `/meal-plans/${DATE}/ate-something-else/`, access, {
      planned_meal_id: meal.id,
      description: '',
    });

    expect(response.status).toBe(200);
    expect(mockDb.foodEntries).toContainEqual(
      expect.objectContaining({
        food_name: 'Something else',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        source: 'manual',
      }),
    );
  });
});
