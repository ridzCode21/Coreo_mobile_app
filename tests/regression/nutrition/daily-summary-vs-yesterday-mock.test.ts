/**
 * Issue #133 — `GET /daily-summary/` now returns `vs_yesterday` (`apps/insights/views.py:178`,
 * computed by `_vs_yesterday` at `apps/insights/views.py:190-229`): `"ahead"`, `"behind"`,
 * `"level"`, or `null`. It is a bare computed value, not a serializer field — there is no
 * enum/choices object server-side, just the three string literals or `None`. Per the backend
 * code:
 *   - `null` when the requested `date` is not the user's local today (`views.py:200-201`).
 *   - `null` when yesterday has no food entries at all (`views.py:210-211`).
 *   - Otherwise, only entries whose time-of-day is at or before the current clock time count
 *     (`views.py:213,217-218`: `cutoff = now_local.time()`, entries after it are skipped) — an
 *     apples-to-apples "as of this time of day" comparison, not full-day totals.
 *   - `"ahead"` when today's cutoff-bound calories exceed yesterday's, `"behind"` when less,
 *     `"level"` when equal (`views.py:225-229`).
 *
 * This test protects the mock handler for `/daily-summary/`
 * (`src/features/nutrition/mocks/handlers.ts`), which must mirror that same logic so the app is
 * testable against the mock without a live backend (CLAUDE.md "mock API layer stays in step with
 * the real backend CODE"). The mock's `todayISO()` (`handlers.ts:39-41`) already uses UTC-sliced
 * dates, so this test fixes the clock with explicit `Z` timestamps and treats entry
 * `created_at` time-of-day as UTC to stay consistent with that existing convention, instead of
 * depending on the host machine's local timezone.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { FoodEntry } from '@/shared/types/food';
import type { DailySummary } from '@/shared/types/dailyLog';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'vs-yesterday-user-1',
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
    id: Math.floor(Math.random() * 1_000_000),
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

async function callDailySummary(token: string, date?: string) {
  const match = resolveMock('GET', '/daily-summary/');
  if (!match) throw new Error('GET /daily-summary/ is not registered');
  return match.handler(
    request({
      method: 'GET',
      path: '/daily-summary/',
      query: date ? { date } : {},
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

describe('nutrition mock: GET /daily-summary/ vs_yesterday (issue #133)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is null when the requested date is not the user's today", async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T09:00:00.000Z', calories: 400 });
    seedFoodEntry({ date: '2026-07-04', created_at: '2026-07-04T09:00:00.000Z', calories: 100 });

    const response = await callDailySummary(access, '2026-07-04');
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBeNull();
  });

  it('is null when yesterday has no logged food at all', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T09:00:00.000Z', calories: 500 });

    const response = await callDailySummary(access);
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBeNull();
  });

  it('is "ahead" when today\'s calories-so-far exceed yesterday\'s at the same time of day', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T08:00:00.000Z', calories: 400 });
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T08:30:00.000Z', calories: 500 });

    const response = await callDailySummary(access);
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBe('ahead');
  });

  it('is "behind" when today\'s calories-so-far trail yesterday\'s at the same time of day', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T08:00:00.000Z', calories: 500 });
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T08:30:00.000Z', calories: 400 });

    const response = await callDailySummary(access);
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBe('behind');
  });

  it('is "level" when today\'s calories-so-far equal yesterday\'s at the same time of day', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T08:00:00.000Z', calories: 450 });
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T08:30:00.000Z', calories: 450 });

    const response = await callDailySummary(access);
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBe('level');
  });

  it('ignores entries logged after the current time of day (no "future" entries in the comparison)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    // "Now" is 10:00 UTC. The 23:00 yesterday entry is after that time-of-day and must be excluded,
    // leaving yesterday's cutoff-bound total at 50 — so today's 100 should read "ahead", not "level".
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T09:30:00.000Z', calories: 50 });
    seedFoodEntry({ date: '2026-07-05', created_at: '2026-07-05T23:00:00.000Z', calories: 1000 });
    seedFoodEntry({ date: '2026-07-06', created_at: '2026-07-06T09:00:00.000Z', calories: 100 });

    const response = await callDailySummary(access);
    expect(response.status).toBe(200);
    expect((response.body as DailySummary).vs_yesterday).toBe('ahead');
  });
});
