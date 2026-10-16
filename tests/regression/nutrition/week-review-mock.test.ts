/**
 * Issue #29 — mock side of `GET /insights/weekly-diet-review/` (`urls.py:40-44`, view
 * `apps/insights/views.py:23-42`, payload `apps/insights/weekly_review.py:131-147`). No mock
 * existed for this route before this issue. Protects: the route is registered, requires auth like
 * every other route (`DEFAULT_PERMISSION_CLASSES`, med_app/settings.py:102-104), defaults to 404
 * `{"error":"no_review"}` when a requested week is absent, lazily seeds the latest mock review
 * for a caller, returns a bare (Style B) payload, never leaks one user's stored review to another,
 * and implements the optional `week_start`
 * query param exactly like the real view (views.py:25-36).
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';
import type { WeeklyDietReview } from '@/shared/types/weeklyDietReview';

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

const FIXTURE_REVIEW: WeeklyDietReview = {
  week_start: '2026-09-28',
  week_end: '2026-10-04',
  generated_at: '2026-10-04T18:00:00+00:00',
  days_on_target: 5,
  headline: "It's working.",
  subtitle: 'Protein up, weight following.',
  adherence_line: 'Five of seven on target.',
  pattern_callout: "Fridays and Saturdays run late and heavy, that's a pattern, not a failure.",
  recommendation: {
    title: 'Move Friday dinner earlier',
    detail: 'Late Friday dinners cost you Saturday too. Move it an hour. That fixes both days.',
  },
  days: [
    {
      date: '2026-09-28',
      weekday: 'Monday',
      calories_in: 2000,
      protein_g: 100,
      weight_kg: 79,
      target_calories: 2000,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-09-29',
      weekday: 'Tuesday',
      calories_in: 1900,
      protein_g: 95,
      weight_kg: null,
      target_calories: 2000,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-09-30',
      weekday: 'Wednesday',
      calories_in: 1800,
      protein_g: 90,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: false,
    },
    {
      date: '2026-10-01',
      weekday: 'Thursday',
      calories_in: 1960,
      protein_g: 100,
      weight_kg: null,
      target_calories: 1960,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-10-02',
      weekday: 'Friday',
      calories_in: 2500,
      protein_g: 100,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: true,
    },
    {
      date: '2026-10-03',
      weekday: 'Saturday',
      calories_in: 2400,
      protein_g: 90,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: true,
    },
    {
      date: '2026-10-04',
      weekday: 'Sunday',
      calories_in: 2000,
      protein_g: 100,
      weight_kg: 79,
      target_calories: 1960,
      on_target: false,
      late_dinner: false,
    },
  ],
  target_changes: [
    {
      previous_calories: 2000,
      new_calories: 1960,
      changed_at: '2026-09-30T09:00:00+00:00',
      source: 'calculated',
      note: 'Targets were recalculated from your profile.',
    },
  ],
};

async function callWeeklyReview(token: string, query: Record<string, string> = {}) {
  const match = resolveMock('GET', '/insights/weekly-diet-review/');
  if (!match) throw new Error('GET /insights/weekly-diet-review/ is not registered');
  const request: MockRequest = {
    method: 'GET',
    path: '/insights/weekly-diet-review/',
    params: match.params,
    query,
    headers: { Authorization: `Bearer ${token}` },
  };
  return match.handler(request);
}

describe('nutrition mock: GET /insights/weekly-diet-review/ (issue #29)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered', () => {
    expect(resolveMock('GET', '/insights/weekly-diet-review/')).toBeDefined();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await callWeeklyReview('not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('lazily seeds a success review for a user so mock mode can render design 15c', async () => {
    const user = seedUser('week-review-user-1');
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access);

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('data');
    expect(mockDb.weeklyDietReviews[user.id]).toHaveLength(1);
  });

  it('returns a bare (unwrapped) payload matching review_payload() once seeded', async () => {
    const user = seedUser('week-review-user-2');
    mockDb.weeklyDietReviews[user.id] = [FIXTURE_REVIEW];
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access);

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('data');
    expect(response.body).toEqual(FIXTURE_REVIEW);
  });

  it("one user's seeded review never leaks into another user's response", async () => {
    const owner = seedUser('week-review-owner');
    const stranger = seedUser('week-review-stranger');
    mockDb.weeklyDietReviews[owner.id] = [FIXTURE_REVIEW];
    mockDb.weeklyDietReviews[stranger.id] = [];
    const { access: strangerAccess } = issueTokenPair(stranger);

    const response = await callWeeklyReview(strangerAccess);

    expect(response.status).toBe(404);
  });

  it('returns the latest review when several are seeded for the caller and no week_start is given', async () => {
    const user = seedUser('week-review-user-3');
    const older = {
      ...FIXTURE_REVIEW,
      week_start: '2026-09-21',
      week_end: '2026-09-27',
    };
    mockDb.weeklyDietReviews[user.id] = [older, FIXTURE_REVIEW];
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access);

    expect((response.body as { week_start: string }).week_start).toBe(FIXTURE_REVIEW.week_start);
  });

  it('returns the matching week when a valid Monday week_start is given (views.py:27-37)', async () => {
    const user = seedUser('week-review-user-4');
    mockDb.weeklyDietReviews[user.id] = [FIXTURE_REVIEW];
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access, { week_start: '2026-09-28' });

    expect(response.status).toBe(200);
    expect((response.body as { week_start: string }).week_start).toBe('2026-09-28');
  });

  it('404s when week_start is a valid Monday but has no stored review', async () => {
    const user = seedUser('week-review-user-5');
    mockDb.weeklyDietReviews[user.id] = [FIXTURE_REVIEW];
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access, { week_start: '2026-10-05' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'no_review' });
  });

  it('400s when week_start is not a Monday (views.py:32-36)', async () => {
    const user = seedUser('week-review-user-6');
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access, { week_start: '2026-09-29' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'week_start must be a Monday.' });
  });

  it('400s when week_start is not a valid ISO date (views.py:28-31)', async () => {
    const user = seedUser('week-review-user-7');
    const { access } = issueTokenPair(user);

    const response = await callWeeklyReview(access, { week_start: 'next-week' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid week_start.' });
  });
});
