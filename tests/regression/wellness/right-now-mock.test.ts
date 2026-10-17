/**
 * Issue #42 — mock-layer contract parity with `GET /users/me/right-now/`
 * (`apps/users/urls.py:37`, view `apps/users/api/views/right_now.py:9-14`, service
 * `apps/users/services/right_now.py`). Pattern mirrors `wind-down-mock.test.ts`.
 *
 * Backend reads today's latest `avg_hr` off `DailyLog.workout_sessions`, a JSON list of session
 * dicts (`apps/insights/models.py:27`, `right_now.py:42-52`). The frontend's shared
 * `DailyLog.workout_sessions` is (incorrectly, pre-existing) typed as a plain count
 * (`src/shared/types/dailyLog.ts:25`) and two other call sites already depend on that shape
 * (plan.md Decision 8) — fixing it is out of scope here. This mock uses its own
 * `mockDb.heartRateReadings` seam instead, keyed `${userId}:${date}`, standing in for "today's
 * most recent avg_hr" without touching the already-wrong shared field.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';

const URL = '/users/me/right-now/';

const BASE_WELLNESS_PROFILE: WellnessProfile = {
  wellness_interview_complete: true,
  wellness_focus: 'sleep',
  nights_note: '',
  morning_first: 'bathroom',
  what_helps: ['chai'],
  check_in_style: 'step_in',
  hide_numbers: false,
};

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'rn-user-1',
    email: 'rn@example.com',
    password: 'unused',
    first_name: 'Right',
    last_name: 'Now',
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

function request(overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>) {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callGet(token?: string) {
  const match = resolveMock('GET', URL);
  if (!match) throw new Error(`GET ${URL} is not registered`);
  return match.handler(
    request({
      method: 'GET',
      path: URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

type RightNowBody = {
  breath: {
    eyebrow: string;
    headline: string;
    cue: string;
    pattern: string;
    line: string;
    not_now: string;
    im_here: string;
    heart_rate?: number;
  } | null;
  message?: string;
};

describe('rightNow mock: GET /users/me/right-now/ (#42)', () => {
  afterEach(() => {
    __resetMockDbForTests();
    jest.useRealTimers();
  });

  it('is registered', () => {
    expect(resolveMock('GET', URL)).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    expect((await callGet()).status).toBe(401);
  });

  it('returns { breath: null, message: "Nothing to do." } with no reading seeded (right_now.py:22-23,42-45)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ breath: null, message: 'Nothing to do.' });
  });

  it('returns { breath: null } when the reading is exactly the spike line, 100 (SPIKE_BPM, right_now.py:8,22)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.heartRateReadings[`${user.id}:2026-10-19`] = 100;
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect((response.body as RightNowBody).breath).toBeNull();
  });

  it('returns the full breath when the reading is above 100 (right_now.py:22,24-32)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.heartRateReadings[`${user.id}:2026-10-19`] = 142;
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const breath = (response.body as RightNowBody).breath!;

    expect(breath).toMatchObject({
      eyebrow: 'Right now',
      headline: "Your heart's been running for twenty minutes. Let's slow it together.",
      cue: 'Breathe out',
      pattern: 'In for 4 · hold for 7 · out for 8',
      line: 'Nothing to pick. Just this, six times.',
      not_now: 'Not now',
      im_here: "I'm here",
    });
    expect((response.body as RightNowBody).message).toBeUndefined();
  });

  it('heart_rate is present only when hide_numbers is false (right_now.py:33-34)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.heartRateReadings[`${user.id}:2026-10-19`] = 142;
    const { access } = issueTokenPair(user);

    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, hide_numbers: false };
    const withNumbers = (await callGet(access)).body as RightNowBody;
    expect(withNumbers.breath!.heart_rate).toBe(142);

    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, hide_numbers: true };
    const withoutNumbers = (await callGet(access)).body as RightNowBody;
    expect(withoutNumbers.breath!.heart_rate).toBeUndefined();
  });

  it("only today's reading counts, not a prior day's spike", async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.heartRateReadings[`${user.id}:2026-10-18`] = 150;
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect((response.body as RightNowBody).breath).toBeNull();
  });
});
