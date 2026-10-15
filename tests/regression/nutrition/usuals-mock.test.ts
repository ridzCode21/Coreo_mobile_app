/**
 * Issue #27 — mock side of `GET /food/usuals/` (`apps/food_tracking/urls.py:9`, view
 * `apps/food_tracking/views.py:126-136`, service `apps/food_tracking/services/usuals.py:35-51,
 * 119-178`). No mock existed for this route before this issue. Protects: the route is registered,
 * requires auth like every other `food_tracking` route, and returns a bare (Style B, unwrapped)
 * payload shaped field-for-field like `services/usuals.py:166-178` — up to 3 suggestions, each
 * carrying `food_name` (what 25a's chips render) alongside the full macro/meta fields a real caller
 * could use later.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(id: string): MockUser {
  const user: MockUser = {
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
  mockDb.users.push(user);
  return user;
}

async function callUsuals(token: string, query: Record<string, string> = {}) {
  const match = resolveMock('GET', '/food/usuals/');
  if (!match) throw new Error('GET /food/usuals/ is not registered');
  const request: MockRequest = {
    method: 'GET',
    path: '/food/usuals/',
    params: match.params,
    query,
    headers: { Authorization: `Bearer ${token}` },
  };
  return match.handler(request);
}

describe('nutrition mock: GET /food/usuals/ (issue #27)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('GET', '/food/usuals/')).toBeDefined();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await callUsuals('not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('returns a bare (unwrapped) payload shaped like services/usuals.py:47-51,166-178', async () => {
    const user = seedUser('usuals-user-1');
    const { access } = issueTokenPair(user);

    const response = await callUsuals(access, { meal_type: 'lunch' });

    expect(response.status).toBe(200);
    const body = response.body as {
      meal_type: string;
      observed_at: string;
      suggestions: Record<string, unknown>[];
    };
    expect(body).not.toHaveProperty('data');
    expect(typeof body.meal_type).toBe('string');
    expect(typeof body.observed_at).toBe('string');
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(body.suggestions.length).toBeLessThanOrEqual(3);

    for (const suggestion of body.suggestions) {
      expect(['repeat', 'yesterday']).toContain(suggestion.kind);
      expect(typeof suggestion.food_name).toBe('string');
      expect(typeof suggestion.meal_type).toBe('string');
      expect(typeof suggestion.calories).toBe('number');
      expect(typeof suggestion.protein_g).toBe('number');
      expect(typeof suggestion.carbs_g).toBe('number');
      expect(typeof suggestion.fat_g).toBe('number');
      expect(typeof suggestion.portion_g).toBe('number');
      expect(suggestion.food_item === null || typeof suggestion.food_item === 'number').toBe(true);
      expect(typeof suggestion.reason_label).toBe('string');
      expect(typeof suggestion.times_logged).toBe('number');
      expect(typeof suggestion.last_logged_on).toBe('string');
    }
  });

  it('echoes the requested meal_type back in the response', async () => {
    const user = seedUser('usuals-user-2');
    const { access } = issueTokenPair(user);

    const response = await callUsuals(access, { meal_type: 'breakfast' });

    expect((response.body as { meal_type: string }).meal_type).toBe('breakfast');
  });

  it('reports observed_at at request time instead of a stale fixture timestamp', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-02-03T04:05:06.000Z'));
    try {
      const user = seedUser('usuals-user-3');
      const { access } = issueTokenPair(user);

      const response = await callUsuals(access, { meal_type: 'dinner' });

      expect((response.body as { observed_at: string }).observed_at).toBe(
        '2027-02-03T04:05:06.000Z',
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
