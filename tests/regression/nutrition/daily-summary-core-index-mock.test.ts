/**
 * Issue #136 — `GET /daily-summary/` now returns `core_index` (`apps/insights/views.py:187-192`,
 * computed by `core_index_for_day` — `apps/users/services/core_index.py:17-30`). Per that service:
 *   - `null` while the account's calibration is incomplete (`core_index.py:24-25`).
 *   - `null` when the requested day has no food and no exercise logged (`core_index.py:26-29`,
 *     `_day_has_log`, `:33-38`).
 *   - Otherwise `_index_from_formula` (`core_index.py:41-46`) is called — and it unconditionally
 *     returns `None` today ("Until that note exists, None. The sample 78 is not a default."): no
 *     design note names the scoring formula yet, so the backend never returns a number for this
 *     field right now, for any user or date. `null` means no index, not zero.
 *
 * This test protects the mock handler for `/daily-summary/` (`src/features/nutrition/mocks/
 * handlers.ts`), which must mirror that exact current behaviour (CLAUDE.md "mock API layer stays
 * in step with the real backend CODE") rather than inventing a placeholder score: `core_index` is
 * present on every response and is always `null`, regardless of calibration state or logged
 * entries, until a later backend change fills in the formula.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { FoodEntry } from '@/shared/types/food';
import type { DailySummary } from '@/shared/types/dailyLog';

let nextFoodEntryId = 1;

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'core-index-user-1',
    email: 'asha@example.com',
    password: 'unused',
    first_name: 'Asha',
    last_name: 'Rao',
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

function seedFoodEntry(overrides: Partial<FoodEntry> & Pick<FoodEntry, 'date' | 'created_at'>) {
  const entry: FoodEntry = {
    id: nextFoodEntryId++,
    meal_type: 'lunch',
    food_item: null,
    food_name: 'Test meal',
    portion_g: null,
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    source: 'manual',
    ai_guess: null,
    ...overrides,
  };
  mockDb.foodEntries.push(entry);
  return entry;
}

function request(overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>) {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callDailySummary(token: string) {
  const match = resolveMock('GET', '/daily-summary/');
  if (!match) throw new Error('GET /daily-summary/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/daily-summary/',
      query: {},
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

describe('nutrition mock: GET /daily-summary/ core_index (issue #136)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
    nextFoodEntryId = 1;
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes core_index on the response body', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callDailySummary(access);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('core_index');
  });

  it('is null with nothing logged for the day', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callDailySummary(access);

    expect((response.body as DailySummary).core_index).toBeNull();
  });

  it('never invents a number: stays null even when food is logged for the day, since the backend has no scoring formula yet', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T09:00:00.000Z', calories: 500 });

    const response = await callDailySummary(access);

    expect((response.body as DailySummary).core_index).toBeNull();
  });
});
