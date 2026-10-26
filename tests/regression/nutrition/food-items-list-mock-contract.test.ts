/**
 * Issue #38, round 2 — `GET /food/items/` now exists for real (apps/food_tracking/urls.py:11,
 * views.py:107-114: `food_items` handles GET+POST; GET does
 * `FoodItem.objects.filter(owner=request.user, source="custom").order_by("-id")`). It did not exist
 * when this issue was last attempted (see plan.md Decision log #1 and the stale
 * `backend-hold-comment.md` in the work folder) — this is the mock for that now-shipped endpoint,
 * powering 32a "My foods" and 32b "My foods · empty". Only the caller's own custom rows come back,
 * newest first; the shared catalog and other users' foods are never included; no rows is `[]`.
 */
import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { FoodItem } from '@/shared/types/food';

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

async function listFoodItems(token?: string) {
  const route = resolveMock('GET', '/food/items/');
  if (!route) throw new Error('GET /food/items/ is not registered');
  const request: MockRequest = {
    method: 'GET',
    path: '/food/items/',
    params: route.params,
    query: {},
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: undefined,
  };
  return route.handler(request);
}

async function createFoodItem(token: string, name: string) {
  const route = resolveMock('POST', '/food/items/');
  if (!route) throw new Error('POST /food/items/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/food/items/',
    params: route.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name,
      calories_per_100g: 100,
      protein_g_per_100g: 10,
      carbs_g_per_100g: 10,
      fat_g_per_100g: 1,
    },
  };
  return route.handler(request);
}

describe('nutrition mock contract: GET /food/items/ (issue #38)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('requires auth', async () => {
    const response = await listFoodItems();
    expect(response.status).toBe(401);
  });

  it('is an empty array for a user with no custom foods yet (screen 32b)', async () => {
    const user = makeUser('my-foods-empty');
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);

    const response = await listFoodItems(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns only the caller's own custom foods, newest first (screen 32a)", async () => {
    const owner = makeUser('my-foods-owner');
    const other = makeUser('my-foods-other');
    mockDb.users.push(owner, other);
    const ownerToken = issueTokenPair(owner).access;
    const otherToken = issueTokenPair(other).access;

    await createFoodItem(ownerToken, "Mom's dal");
    await createFoodItem(ownerToken, 'Protein overnight oats');
    await createFoodItem(otherToken, "Someone else's lunch");

    const response = await listFoodItems(ownerToken);

    expect(response.status).toBe(200);
    const body = response.body as FoodItem[];
    expect(body.map((item) => item.name)).toEqual(['Protein overnight oats', "Mom's dal"]);
    expect(body.every((item) => item.source === 'custom')).toBe(true);
  });

  it('never includes the shared catalog (seeded, unowned) items', async () => {
    const user = makeUser('my-foods-vs-catalog');
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);

    // Seed the catalog the same way GET /food/search/ does, without creating any custom food.
    await resolveMock('GET', '/food/search/')?.handler({
      method: 'GET',
      path: '/food/search/',
      params: {},
      query: { q: 'chicken' },
      headers: { Authorization: `Bearer ${access}` },
      body: undefined,
    });

    const response = await listFoodItems(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
