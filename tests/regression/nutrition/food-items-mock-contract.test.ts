/**
 * Issue #38 — `POST /food/items/` contract (apps/food_tracking/urls.py:11, views.py:107-122,
 * serializers.py:67-95, models.py:9-47). The mock must match the real endpoint exactly: `owner`
 * and `source` are server-set ("custom", never accepted from the request), and a duplicate
 * barcode for the same owner is a 400 with the exact DRF field-error shape the view returns
 * (views.py:117-121, backed by the `fooditem_owner_barcode_unique` constraint, models.py:37-41).
 * No barcode field exists on the 32c "Add a food" screen, but the contract itself must still be
 * faithful — this test hits the mock handler directly (same pattern as
 * food-entries-contract.test.ts) rather than going through the UI.
 */
import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

function makeUser(id: string): MockUser {
  return {
    id,
    email: `${id}@example.com`,
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

async function postFoodItem(token: string, body: Record<string, unknown>) {
  const route = resolveMock('POST', '/food/items/');
  if (!route) throw new Error('POST /food/items/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/food/items/',
    params: route.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body,
  };
  return route.handler(request);
}

describe('nutrition mock contract: POST /food/items/ (issue #38)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('creates a custom food item and never accepts owner/source from the request', async () => {
    const user = makeUser('add-food-user');
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);

    const response = await postFoodItem(access, {
      name: "Mom's dal",
      owner: 'someone-else', // must be ignored — server-set
      source: 'off', // must be ignored — server-set to "custom"
      calories_per_100g: 182,
      protein_g_per_100g: 9,
      carbs_g_per_100g: 22,
      fat_g_per_100g: 6,
    });

    expect(response.status).toBe(201);
    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      name: "Mom's dal",
      source: 'custom',
      calories_per_100g: 182,
      protein_g_per_100g: 9,
      carbs_g_per_100g: 22,
      fat_g_per_100g: 6,
    });
    expect(body).not.toHaveProperty('owner');
  });

  it('rejects a missing name with a 400 field error', async () => {
    const user = makeUser('add-food-user-2');
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);

    const response = await postFoodItem(access, {
      calories_per_100g: 100,
      protein_g_per_100g: 1,
      carbs_g_per_100g: 1,
      fat_g_per_100g: 1,
    });

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate barcode for the same owner with the exact backend field-error shape', async () => {
    const user = makeUser('add-food-user-3');
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);

    const first = await postFoodItem(access, {
      name: 'Protein bar',
      barcode: '1112223334445',
      calories_per_100g: 400,
      protein_g_per_100g: 30,
      carbs_g_per_100g: 40,
      fat_g_per_100g: 15,
    });
    expect(first.status).toBe(201);

    const second = await postFoodItem(access, {
      name: 'Protein bar, second batch',
      barcode: '1112223334445',
      calories_per_100g: 400,
      protein_g_per_100g: 30,
      carbs_g_per_100g: 40,
      fat_g_per_100g: 15,
    });

    expect(second.status).toBe(400);
    expect(second.body).toEqual({
      barcode: ['A food with this barcode already exists.'],
    });
  });

  it('allows two different owners to use the same barcode (per-owner uniqueness only)', async () => {
    const userA = makeUser('owner-a');
    const userB = makeUser('owner-b');
    mockDb.users.push(userA, userB);
    const tokenA = issueTokenPair(userA).access;
    const tokenB = issueTokenPair(userB).access;

    const payload = {
      name: 'Protein bar',
      barcode: '9998887776665',
      calories_per_100g: 400,
      protein_g_per_100g: 30,
      carbs_g_per_100g: 40,
      fat_g_per_100g: 15,
    };

    const first = await postFoodItem(tokenA, payload);
    const second = await postFoodItem(tokenB, payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });
});
