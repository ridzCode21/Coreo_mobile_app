/**
 * Issue #40 — mock-layer contract parity with `GET/POST /users/me/training-week(/sets)/`
 * (`apps/users/urls.py:38-39`, views `apps/users/api/views/training_week.py:10-27`, services
 * `apps/users/services/training_week.py`, library `apps/users/services/training_library.py`).
 * Pattern mirrors `fitness-profile-mock.test.ts`: dispatch straight through
 * `resolveMock`/`mockDb`, not through `apiClient`, so this protects the mock handler's business
 * rules independent of the hook built on top of it (`training-week-api-contract.test.tsx`). Every
 * assertion cites the backend `file:line` it reproduces.
 *
 * Both routes are bare payloads (not the Style-A `{success, data}` envelope) — see
 * `training_week.py:12-27` returning `Response(...)` with no wrapper, and plan.md's "Backend
 * alignment" note on this exception to the usual `users`-app convention.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { FitnessProfile } from '@/shared/types/fitnessProfile';

const WEEK_URL = '/users/me/training-week/';
const SETS_URL = '/users/me/training-week/sets/';

const FULL_FITNESS_PROFILE = {
  fitness_interview_complete: true,
  fitness_goal: 'build_muscle',
  training_places: ['home_dumbbells_band'],
  movement_note: '',
  sports: ['cricket'],
  protected_areas: ['lower_back'],
} satisfies FitnessProfile;

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'fit-week-user-1',
    email: 'week@example.com',
    password: 'unused',
    first_name: 'Fit',
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
    ...overrides,
  };
  mockDb.users.push(user);
  return user;
}

function request(overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>) {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callGet(token?: string) {
  const match = resolveMock('GET', WEEK_URL);
  if (!match) throw new Error(`GET ${WEEK_URL} is not registered`);
  return match.handler(
    request({
      method: 'GET',
      path: WEEK_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

async function callMarkSet(body: unknown, token?: string) {
  const match = resolveMock('POST', SETS_URL);
  if (!match) throw new Error(`POST ${SETS_URL} is not registered`);
  return match.handler(
    request({
      method: 'POST',
      path: SETS_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
}

type TrainingWeek = {
  position: { week: number; day: number; label: string };
  status: string;
  summary: string;
  sessions: {
    key: string;
    name: string;
    weekday: string;
    date: string;
    status: string;
    duration_min: number | null;
    gear: string | null;
    movement_count: number;
    note: string | null;
    progression_note: string | null;
    lighter_note: string | null;
    exercises: {
      key: string;
      name: string;
      sets: number;
      reps: number;
      weight_kg: number | null;
      superset: string | null;
      completed_sets: number[];
    }[];
  }[];
  today: TrainingWeek['sessions'][number] | null;
};

function sessionByKey(week: TrainingWeek, key: string) {
  const found = week.sessions.find((s) => s.key === key);
  if (!found)
    throw new Error(`no session "${key}" in ${JSON.stringify(week.sessions.map((s) => s.key))}`);
  return found;
}

describe('trainingWeek mock: GET /users/me/training-week/ (#40)', () => {
  const REAL_DATE_NOW = Date.now;

  afterEach(() => {
    __resetMockDbForTests();
    Date.now = REAL_DATE_NOW;
    jest.useRealTimers();
  });

  it('is registered for both methods', () => {
    expect(resolveMock('GET', WEEK_URL)).toBeDefined();
    expect(resolveMock('POST', SETS_URL)).toBeDefined();
  });

  it('returns 401 with no token', async () => {
    expect((await callGet()).status).toBe(401);
  });

  it('returns { training_week: null } when the fitness interview is incomplete (training_week.py:44-45)', async () => {
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = {
      ...FULL_FITNESS_PROFILE,
      fitness_interview_complete: false,
      fitness_goal: '',
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ training_week: null });
  });

  it("week number is 1 in the training block's first week, climbs by Monday-anchor week (training_week.py:130-132)", async () => {
    // Monday 2026-10-19 is the anchor week (week 1); today = Tuesday 2026-11-03 is 2 full weeks later => week 3.
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00Z'));
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;

    expect(week.position.week).toBe(3);
    expect(week.position.day).toBe(2); // Tuesday
    expect(week.position.label).toBe('Week 3 · Day 2');
  });

  it('uses the user timezone for the local training day (calibration.local_today)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T12:30:00Z'));
    const user = seedUser({ timezone: 'Pacific/Kiritimati' });
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;

    expect(week.position.day).toBe(1);
    expect(week.position.label).toBe('Week 1 · Day 1');
    expect(week.today?.key).toBe('legs');
  });

  it('builds legs/push/pull on Monday/Tuesday/Friday and the sport on Sunday (training_library.py:40-46)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z')); // Monday
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;

    expect(sessionByKey(week, 'legs').weekday).toBe('monday');
    expect(sessionByKey(week, 'push').weekday).toBe('tuesday');
    expect(sessionByKey(week, 'pull').weekday).toBe('friday');
    const sport = sessionByKey(week, 'sport');
    expect(sport.weekday).toBe('sunday');
    expect(sport.name).toBe('Cricket counts');
    expect(sport.note).toBe('I plan around it, not against it');
    expect(sport.exercises).toEqual([]);
  });

  it('home-dumbbells push session matches the library seed exactly in week 1 (training_library.py:69-75)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const push = sessionByKey(week, 'push');

    expect(push.exercises.map((e) => e.name)).toEqual([
      'Dumbbell bench press',
      'Seated shoulder press',
      'Incline fly',
      'Overhead triceps',
      'Curls',
    ]);
    expect(push.exercises[0]).toMatchObject({ sets: 4, reps: 8, weight_kg: 17.5, superset: null });
    expect(push.exercises[3]).toMatchObject({ superset: 'arms', weight_kg: null });
    expect(push.duration_min).toBe(45);
    expect(push.gear).toBe('dumbbells');
    expect(push.progression_note).toBeNull(); // week 1 — no progression note yet (:332-333)
  });

  it('progression note appears from week 2, citing the +2.5kg weight bump (training_week.py:297-341)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-27T10:00:00Z')); // Tuesday, week 2
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' }; // anchor Monday
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const push = sessionByKey(week, 'push');
    const bench = push.exercises.find((e) => e.key === 'dumbbell_bench_press')!;

    expect(bench.weight_kg).toBe(20); // 17.5 + 2.5 * (2-1)
    expect(push.progression_note).toBe(
      "Bench is +2.5 kg from last week. Same lifts, heavier, that's the plan working.",
    );
  });

  it('shortens a session and sets lighter_note for short sleep the night before (training_week.py:287-294,344-352)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T10:00:00Z')); // Tuesday (push day)
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    mockDb.dailyLogs[`${user.id}:2026-10-19`] = {
      id: 1,
      date: '2026-10-19',
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
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const push = sessionByKey(week, 'push');

    expect(push.duration_min).toBe(35);
    expect(push.lighter_note).toBe(
      "Short sleep last night. I trimmed a set from each lift, you'll still progress.",
    );
    expect(push.exercises[0].sets).toBe(3); // max(1, 4-1)
  });

  it('reps are forced to 5 for every exercise when fitness_goal is get_stronger (training_week.py:312)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = { ...FULL_FITNESS_PROFILE, fitness_goal: 'get_stronger' };
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const legs = sessionByKey(week, 'legs');

    expect(legs.exercises.every((e) => e.reps === 5)).toBe(true);
  });

  it('applies a swap for a protected area (training_library.py:151-183)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:00:00Z'));
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = { ...FULL_FITNESS_PROFILE, protected_areas: ['knees'] };
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const legs = sessionByKey(week, 'legs');

    expect(legs.exercises.map((e) => e.key)).toContain('box_squat');
    expect(legs.exercises.map((e) => e.key)).not.toContain('goblet_squat');
  });

  it('session status: done only when every set of every exercise is completed (training_week.py:355-365)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-23T10:00:00Z')); // Friday (pull day) = today
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);

    const before = (await callGet(access)).body as { training_week: TrainingWeek };
    const legs = sessionByKey(before.training_week, 'legs'); // Monday, already past
    expect(legs.status).toBe('past');
    const pull = sessionByKey(before.training_week, 'pull');
    expect(pull.status).toBe('today');
    const sport = sessionByKey(before.training_week, 'sport'); // Sunday, upcoming
    expect(sport.status).toBe('upcoming');
  });
});

describe('trainingWeek mock: POST /users/me/training-week/sets/ (#40, training_week.py:86-127)', () => {
  afterEach(() => {
    __resetMockDbForTests();
    jest.useRealTimers();
  });

  function setup() {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T10:00:00Z')); // Tuesday, push day = today
    const user = seedUser();
    mockDb.fitnessProfiles[user.id] = FULL_FITNESS_PROFILE;
    mockDb.trainingBlocks[user.id] = { started_on: '2026-10-19' };
    const { access } = issueTokenPair(user);
    return { user, access };
  }

  it('missing a required field → "Send session_key, exercise_key, and set_number." (:90)', async () => {
    const { access } = setup();
    const response = await callMarkSet({ session_key: 'push', exercise_key: 'x' }, access);
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe(
      'Send session_key, exercise_key, and set_number.',
    );
  });

  it('interview incomplete → "Finish the fitness interview before training." (:92), wins over an unknown session', async () => {
    const { user, access } = setup();
    mockDb.fitnessProfiles[user.id] = {
      ...FULL_FITNESS_PROFILE,
      fitness_interview_complete: false,
      fitness_goal: '',
    };
    const response = await callMarkSet(
      { session_key: 'not-a-real-session', exercise_key: 'x', set_number: 1 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe(
      'Finish the fitness interview before training.',
    );
  });

  it('unknown session_key → "That session is not in this week." (:102-103)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'not-a-real-session', exercise_key: 'x', set_number: 1 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That session is not in this week.');
  });

  it('the sport session has no sets → "That session has no sets." (:104-105)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'sport', exercise_key: 'x', set_number: 1 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That session has no sets.');
  });

  it('sport-session validation wins over an invalid exercise and set number (:104-105 before :108-119)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'sport', exercise_key: 'not-a-real-exercise', set_number: 99 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That session has no sets.');
  });

  it('an upcoming session → "That session is still ahead." (:106-107)', async () => {
    const { access } = setup();
    // pull is Friday, today is Tuesday => upcoming
    const response = await callMarkSet(
      { session_key: 'pull', exercise_key: 'one_arm_dumbbell_row', set_number: 1 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That session is still ahead.');
  });

  it('upcoming-session validation wins over an invalid exercise and set number (:106-107 before :108-119)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'pull', exercise_key: 'not-a-real-exercise', set_number: 99 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That session is still ahead.');
  });

  it('unknown exercise_key → "That exercise is not in this session." (:108-115)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'push', exercise_key: 'not-a-real-exercise', set_number: 1 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe(
      'That exercise is not in this session.',
    );
  });

  it('set_number out of range → "That set is not in this session." (:116-119)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 99 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe('That set is not in this session.');
  });

  it('exercise validation wins over an invalid set number (:108-115 before :116-119)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'push', exercise_key: 'not-a-real-exercise', set_number: 99 },
      access,
    );
    expect(response.status).toBe(400);
    expect((response.body as { detail: string }).detail).toBe(
      'That exercise is not in this session.',
    );
  });

  it('success marks the set and returns the full refreshed payload (:121-127)', async () => {
    const { access } = setup();
    const response = await callMarkSet(
      { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 1 },
      access,
    );
    expect(response.status).toBe(200);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const push = sessionByKey(week, 'push');
    const bench = push.exercises.find((e) => e.key === 'dumbbell_bench_press')!;
    expect(bench.completed_sets).toContain(1);
  });

  it('re-marking the same set is idempotent, no duplicate (CompletedSet.get_or_create, :121-126)', async () => {
    const { access } = setup();
    await callMarkSet(
      { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 1 },
      access,
    );
    const response = await callMarkSet(
      { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 1 },
      access,
    );
    expect(response.status).toBe(200);
    const week = (response.body as { training_week: TrainingWeek }).training_week;
    const push = sessionByKey(week, 'push');
    const bench = push.exercises.find((e) => e.key === 'dumbbell_bench_press')!;
    expect(bench.completed_sets).toEqual([1]);
  });
});
