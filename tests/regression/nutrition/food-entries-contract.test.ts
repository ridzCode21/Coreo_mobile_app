import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const DATE = '2026-10-15';

describe('nutrition mock contract: GET /food/entries/ (issue #22)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns the backend nested macro-summary shape', async () => {
    const user: MockUser = {
      id: 'diet-home-user',
      email: 'diet-home@example.com',
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
    const { access } = issueTokenPair(user);
    const route = resolveMock('GET', '/food/entries/');
    if (!route) throw new Error('GET /food/entries/ is not registered');

    const request: MockRequest = {
      method: 'GET',
      path: '/food/entries/',
      params: route.params,
      query: { date: DATE },
      headers: { Authorization: `Bearer ${access}` },
    };
    const response = await route.handler(request);
    const body = response.body as {
      macro_summary: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(Object.keys(body.macro_summary).sort()).toEqual([
      'calories',
      'carbs_g',
      'fat_g',
      'protein_g',
    ]);
    expect(body.macro_summary.calories).toEqual({
      consumed: 0,
      target: 0,
      remaining: 0,
      over: false,
    });
    expect(body.macro_summary).not.toHaveProperty('calories_in');
  });
});
