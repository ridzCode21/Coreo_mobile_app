/**
 * Issue #38 — `GET /food/search/` contract (apps/food_tracking/urls.py:15, views.py:69-104).
 * The real view scopes custom hits to `FoodItem.objects.filter(owner=request.user, ...)`
 * (views.py:81-83) and returns the caller's custom matches first, then Open Food Facts matches,
 * deduped by id, capped at `page_size` (views.py:95-104). The pre-existing mock had no owner
 * filtering at all, so one user's custom foods would have leaked into every other user's search —
 * design 32a's "only you can see these" promise depends on this being fixed. This also locks in
 * the corrected catalog `source: "off"` fixture value (API_REFERENCE.md:1320; models.py:23)
 * instead of the old invented `"openfoodfacts"`.
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

async function postFoodItem(token: string, name: string) {
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
      calories_per_100g: 150,
      protein_g_per_100g: 10,
      carbs_g_per_100g: 10,
      fat_g_per_100g: 5,
    },
  };
  return route.handler(request);
}

async function searchFood(token: string, q: string) {
  const route = resolveMock('GET', '/food/search/');
  if (!route) throw new Error('GET /food/search/ is not registered');
  const request: MockRequest = {
    method: 'GET',
    path: '/food/search/',
    params: route.params,
    query: { q },
    headers: { Authorization: `Bearer ${token}` },
  };
  return route.handler(request);
}

describe('nutrition mock contract: GET /food/search/ (issue #38)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it("never returns another user's custom foods", async () => {
    const userA = makeUser('search-owner-a');
    const userB = makeUser('search-owner-b');
    mockDb.users.push(userA, userB);
    const tokenA = issueTokenPair(userA).access;
    const tokenB = issueTokenPair(userB).access;

    await postFoodItem(tokenA, "Mom's secret dal");
    await postFoodItem(tokenB, "Mom's secret dal, a different mom");

    const resultsA = (await searchFood(tokenA, 'secret dal')).body as { name: string }[];

    expect(resultsA.map((item) => item.name)).toEqual(["Mom's secret dal"]);
  });

  it('returns catalog hits with source "off", matching the real backend default', async () => {
    const user = makeUser('search-catalog-user');
    mockDb.users.push(user);
    const token = issueTokenPair(user).access;

    const results = (await searchFood(token, 'yogurt')).body as { source: string }[];

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.source === 'off')).toBe(true);
  });

  it("puts the caller's custom hits before catalog hits", async () => {
    const user = makeUser('search-order-user');
    mockDb.users.push(user);
    const token = issueTokenPair(user).access;

    // Seeded catalog item "Greek Yogurt" (fixtures.ts) shares the "yogurt" substring.
    await postFoodItem(token, 'My homemade yogurt');

    const results = (await searchFood(token, 'yogurt')).body as {
      name: string;
      source: string;
    }[];

    expect(results[0]).toMatchObject({ name: 'My homemade yogurt', source: 'custom' });
    expect(results.some((item) => item.name === 'Greek Yogurt')).toBe(true);
  });
});
