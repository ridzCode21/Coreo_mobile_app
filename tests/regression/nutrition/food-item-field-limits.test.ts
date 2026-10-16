import '@/shared/api/mock/registerAllMocks';

import { addFoodSchema } from '@/features/nutrition/schemas';
import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const VALID_MACROS = {
  calories_per_100g: 100,
  protein_g_per_100g: 1,
  carbs_g_per_100g: 1,
  fat_g_per_100g: 1,
};

function makeUser(): MockUser {
  return {
    id: 'field-limit-user',
    email: 'field-limit-user@example.com',
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
}

describe('nutrition custom-food backend field limits', () => {
  beforeEach(() => __resetMockDbForTests());

  it('rejects a name longer than the backend model maximum', () => {
    expect(addFoodSchema.safeParse({ name: 'a'.repeat(256), ...VALID_MACROS }).success).toBe(false);
  });

  it('returns a field error for a barcode longer than the backend model maximum', async () => {
    const user = makeUser();
    mockDb.users.push(user);
    const token = issueTokenPair(user).access;
    const route = resolveMock('POST', '/food/items/');
    if (!route) throw new Error('POST /food/items/ is not registered');
    const request: MockRequest = {
      method: 'POST',
      path: '/food/items/',
      params: route.params,
      query: {},
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'Protein bar', barcode: '1'.repeat(51), ...VALID_MACROS },
    };

    const response = await route.handler(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      barcode: ['Ensure this field has no more than 50 characters.'],
    });
  });

  it('coerces numeric strings and normalizes a blank barcode like DRF', async () => {
    const user = makeUser();
    mockDb.users.push(user);
    const token = issueTokenPair(user).access;
    const route = resolveMock('POST', '/food/items/');
    if (!route) throw new Error('POST /food/items/ is not registered');
    const request: MockRequest = {
      method: 'POST',
      path: '/food/items/',
      params: route.params,
      query: {},
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Protein bar',
        barcode: '   ',
        calories_per_100g: '100',
        protein_g_per_100g: '1',
        carbs_g_per_100g: '1',
        fat_g_per_100g: '1',
      },
    };

    const response = await route.handler(request);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      barcode: null,
      calories_per_100g: 100,
      protein_g_per_100g: 1,
      carbs_g_per_100g: 1,
      fat_g_per_100g: 1,
    });
  });
});
