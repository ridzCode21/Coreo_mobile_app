/**
 * Issue #42 — mock-layer contract parity with `GET /users/me/wind-down/`
 * (`apps/users/urls.py:36`, view `apps/users/api/views/wind_down.py:9-14`, service
 * `apps/users/services/wind_down.py`). Pattern mirrors `training-week-mock.test.ts`: dispatch
 * straight through `resolveMock`/`mockDb`, not through `apiClient`. Bare payload, not the Style-A
 * envelope (`wind_down.py:14` returns `Response(wind_down_payload(...))` directly).
 *
 * The chat-based start-time override (`wind_down.py:104-109`, `wind_down_start_for`) is not
 * modeled — the presence/chat feature it depends on isn't built in this app (plan.md Decision 4).
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';
import type { FitnessProfile } from '@/shared/types/fitnessProfile';

const URL = '/users/me/wind-down/';

const BASE_WELLNESS_PROFILE: WellnessProfile = {
  wellness_interview_complete: true,
  wellness_focus: 'sleep',
  nights_note: '',
  nights_tags: [],
  morning_first: 'bathroom',
  what_helps: ['chai'],
  check_in_style: 'step_in',
  hide_numbers: false,
};

const COMPLETE_FITNESS_PROFILE: FitnessProfile = {
  fitness_interview_complete: true,
  fitness_goal: 'build_muscle',
  training_places: ['home_dumbbells_band'],
  movement_note: '',
  sports: [],
  protected_areas: [],
};

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'wd-user-1',
    email: 'wd@example.com',
    password: 'unused',
    first_name: 'Wind',
    last_name: 'Down',
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

type WindDownBody = {
  wind_down: {
    clock: string;
    headline: string;
    title: string;
    lights_out: string;
    steps: { time: string; text: string; reason: string }[];
    line: string;
    reason: string;
    plain_words?: string;
    pushed: boolean;
  } | null;
};

describe('windDown mock: GET /users/me/wind-down/ (#42)', () => {
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

  it('returns { wind_down: null } when the wellness interview is incomplete (wind_down.py:73-74)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = {
      ...BASE_WELLNESS_PROFILE,
      wellness_interview_complete: false,
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ wind_down: null });
  });

  it('always returns title "Tonight\'s wind-down", lights_out "10:45", pushed false (wind_down.py:17-18,104)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.title).toBe("Tonight's wind-down");
    expect(windDown.lights_out).toBe('10:45');
    expect(windDown.pushed).toBe(false);
  });

  it('uses the per-focus headline when not in "stakes" mode (wind_down.py:26-32,85)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, wellness_focus: 'racing_mind' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.headline).toBe('Your mind is still running. Tonight we land it.');
  });

  it('third step matches THIRD_STEP[wellness_focus] (wind_down.py:40-46,93)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, wellness_focus: 'low_energy' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[2]).toEqual({
      time: '10:30',
      text: 'stay lying down, six slow breaths',
      reason: '2 min, guided',
    });
  });

  it('second step is the chai tuple when "chai" is among what_helps, even if listed later (wind_down.py:48-54,136-138)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, what_helps: ['walks', 'chai'] };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[1]).toEqual({
      time: '10:00',
      text: 'chai on the balcony, no screens',
      reason: 'yours already',
    });
  });

  it('second step falls back to the first listed help when chai is absent (wind_down.py:135-138)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, what_helps: ['music'] };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[1]).toEqual({
      time: '10:00',
      text: 'music on, no screens',
      reason: 'yours already',
    });
  });

  it('first step: phone + "till 1am" note -> "the 1 AM fix" (wind_down.py:63-67,120-121)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = {
      ...BASE_WELLNESS_PROFILE,
      nights_note: 'Scroll my phone till 1am most nights',
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[0]).toEqual({
      time: '9:45',
      text: 'phone goes to the kitchen',
      reason: 'the 1 AM fix',
    });
  });

  it('first step: empty note, morning_first "phone" -> "before it comes to bed" (wind_down.py:130-131)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = {
      ...BASE_WELLNESS_PROFILE,
      nights_note: '',
      morning_first: 'phone',
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[0]).toEqual({
      time: '9:45',
      text: 'phone goes to the kitchen',
      reason: 'before it comes to bed',
    });
  });

  it('first step: empty note, no phone morning -> "a clean stop" default (wind_down.py:132)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = {
      ...BASE_WELLNESS_PROFILE,
      nights_note: '',
      morning_first: 'bathroom',
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.steps[0]).toEqual({
      time: '9:45',
      text: 'screens go to another room',
      reason: 'a clean stop',
    });
  });

  it('plain_words is present only when hide_numbers is true (wind_down.py:102-103)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, hide_numbers: false };
    const { access } = issueTokenPair(user);

    const withoutFlag = (await callGet(access)).body as WindDownBody;
    expect(withoutFlag.wind_down!.plain_words).toBeUndefined();

    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, hide_numbers: true };
    const withFlag = (await callGet(access)).body as WindDownBody;
    expect(withFlag.wind_down!.plain_words).toBe(
      'You asked for plain words, no scores here. The graphs exist if you ever want them.',
    );
  });

  it('"stakes" headline/reason win when two prior nights were short and tomorrow is a push day (wind_down.py:80,167-183)', async () => {
    // Monday 2026-10-19 "today" (UTC) -> tomorrow Tuesday 2026-10-20 (PUSH_WEEKDAY=2).
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.fitnessProfiles[user.id] = COMPLETE_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-01' };
    mockDb.dailyLogs[`${user.id}:2026-10-17`] = {
      id: 1,
      date: '2026-10-17',
      calories_in: 0,
      calories_out: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
      steps: 0,
      weight_kg: null,
      sleep_hours: 5,
      hrv: null,
      source: 'manual',
      workout_sessions: 0,
    };
    mockDb.dailyLogs[`${user.id}:2026-10-18`] = {
      ...mockDb.dailyLogs[`${user.id}:2026-10-17`],
      date: '2026-10-18',
      sleep_hours: 5.5,
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.headline).toBe('Your day ran hot. Tonight we land it early.');
    expect(windDown.reason).toBe(
      'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
    );
  });

  it('no "stakes" when only one of the two prior nights was short (wind_down.py:167-173)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.fitnessProfiles[user.id] = COMPLETE_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-01' };
    mockDb.dailyLogs[`${user.id}:2026-10-17`] = {
      id: 1,
      date: '2026-10-17',
      calories_in: 0,
      calories_out: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
      steps: 0,
      weight_kg: null,
      sleep_hours: 7,
      hrv: null,
      source: 'manual',
      workout_sessions: 0,
    };
    mockDb.dailyLogs[`${user.id}:2026-10-18`] = {
      ...mockDb.dailyLogs[`${user.id}:2026-10-17`],
      date: '2026-10-18',
      sleep_hours: 5,
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.headline).toBe('Sleep is the heavy one. Tonight we protect it.');
  });

  it('no "stakes" when the fitness interview is incomplete, even with two short nights (wind_down.py:176-178)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.fitnessProfiles[user.id] = {
      ...COMPLETE_FITNESS_PROFILE,
      fitness_interview_complete: false,
    };
    mockDb.dailyLogs[`${user.id}:2026-10-17`] = {
      id: 1,
      date: '2026-10-17',
      calories_in: 0,
      calories_out: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
      steps: 0,
      weight_kg: null,
      sleep_hours: 5,
      hrv: null,
      source: 'manual',
      workout_sessions: 0,
    };
    mockDb.dailyLogs[`${user.id}:2026-10-18`] = {
      ...mockDb.dailyLogs[`${user.id}:2026-10-17`],
      date: '2026-10-18',
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const windDown = (response.body as WindDownBody).wind_down!;

    expect(windDown.headline).toBe('Sleep is the heavy one. Tonight we protect it.');
  });
});
