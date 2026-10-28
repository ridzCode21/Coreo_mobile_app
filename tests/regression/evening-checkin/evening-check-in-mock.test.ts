/**
 * Issue #46 — mock-layer contract parity with `GET/POST /users/me/evening-check-in/`
 * (`apps/users/urls.py:58`, view `apps/users/api/views/evening_check_in.py:14-25`, service
 * `apps/users/services/evening_check_in.py`). Pattern mirrors `wind-down-mock.test.ts`: dispatch
 * straight through `resolveMock`/`mockDb`, not through `apiClient`. Bare payload, not the Style-A
 * envelope.
 *
 * The full nudge rule engine (`nudge_rules.py`) is not modeled in the mock's `tomorrow_preview` —
 * plan.md Decision 10 documents the simplified subset asserted here (rough → the small-day line;
 * otherwise, logged food today or yesterday → the push-day line; otherwise nothing).
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';

const URL = '/users/me/evening-check-in/';

const PREVIEW_PUSH_LINE = "Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here.";
const PREVIEW_SMALL_LINE = "Tomorrow stays small. Lights out 10:45. I'll take it from here.";
const NOTHING_TOMORROW = 'Nothing for tomorrow.';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'ec-user-1',
    email: 'ec@example.com',
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

function request(overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>) {
  return { params: {}, query: {}, headers: {}, body: undefined, ...overrides };
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

async function callPost(body: unknown, token?: string) {
  const match = resolveMock('POST', URL);
  if (!match) throw new Error(`POST ${URL} is not registered`);
  return match.handler(
    request({
      method: 'POST',
      path: URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
}

type RitualBody = {
  eyebrow: string;
  question: string;
  moods: { key: string; label: string }[];
  looks_right_label: string;
  fix_label: string;
  recap: string[];
  note_prompt: string;
  close_label: string;
  closed: boolean;
  preview?: { eyebrow: string; line: string; action: string } | null;
  message?: string;
};

type CloseBody = {
  check_in: { local_date: string; mood: string; closed: true };
  preview: { eyebrow: string; line: string; action: string } | null;
  message?: string;
};

describe('eveningCheckIn mock: GET/POST /users/me/evening-check-in/ (#46)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T21:00:00Z')); // Monday 9pm UTC
  });

  afterEach(() => {
    __resetMockDbForTests();
    jest.useRealTimers();
  });

  it('is registered for GET and POST', () => {
    expect(resolveMock('GET', URL)).toBeDefined();
    expect(resolveMock('POST', URL)).toBeDefined();
  });

  it('returns 401 with no token for GET and POST', async () => {
    expect((await callGet()).status).toBe(401);
    expect((await callPost({ mood: 'good' })).status).toBe(401);
  });

  it('returns the literal copy fields and closed: false with nothing logged (evening_check_in.py:63-74)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(response.status).toBe(200);
    expect(body.eyebrow).toBe('Evening check-in · 20 seconds');
    expect(body.question).toBe('How did today feel?');
    expect(body.moods).toEqual([
      { key: 'rough', label: 'Rough' },
      { key: 'meh', label: 'Meh' },
      { key: 'okay', label: 'Okay' },
      { key: 'good', label: 'Good' },
      { key: 'great', label: 'Great' },
    ]);
    expect(body.looks_right_label).toBe('Looks right?');
    expect(body.fix_label).toBe('Fix something');
    expect(body.note_prompt).toBe('Anything for tomorrow-me?');
    expect(body.close_label).toBe('Close the day');
    expect(body.recap).toEqual([]);
    expect(body.closed).toBe(false);
    expect(body.preview).toBeUndefined();
    expect(body.message).toBeUndefined();
  });

  it('recap includes steps, lunch and a moved session, in that order (evening_check_in.py:91-107)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = BASE_WELLNESS_PROFILE;
    mockDb.dailyLogs[`${user.id}:2026-10-05`] = {
      id: 1,
      date: '2026-10-05',
      calories_in: 0,
      calories_out: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
      steps: 7904,
      weight_kg: null,
      sleep_hours: 7,
      hrv: null,
      source: 'manual',
      workout_sessions: 0,
    };
    mockDb.foodEntries.push({
      id: 1,
      date: '2026-10-05',
      meal_type: 'lunch',
      food_item: null,
      food_name: 'rice bowl',
      portion_g: null,
      calories: 500,
      protein_g: 20,
      carbs_g: 40,
      fat_g: 10,
      source: 'manual',
      ai_guess: null,
      created_at: '2026-10-05T12:00:00Z',
    });
    mockDb.chatTurns['turn-1'] = {
      id: 'turn-1',
      userId: user.id,
      message: 'move it',
      status: 'applied',
      receipts: [],
      effects: { fitness: { session_key: 'legs', from_date: '2026-10-05', to_date: '2026-10-08' } },
      before: null,
      createdAt: Date.now(),
      appliedAt: Date.now(),
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.recap).toEqual([
      '7,904 steps',
      'Lunch logged · rice bowl',
      'No session — moved to Thursday',
    ]);
  });

  it('omits the steps line when hide_numbers is true (evening_check_in.py:94)', async () => {
    const user = seedUser();
    mockDb.wellnessProfiles[user.id] = { ...BASE_WELLNESS_PROFILE, hide_numbers: true };
    mockDb.dailyLogs[`${user.id}:2026-10-05`] = {
      id: 1,
      date: '2026-10-05',
      calories_in: 0,
      calories_out: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
      steps: 7904,
      weight_kg: null,
      sleep_hours: 7,
      hrv: null,
      source: 'manual',
      workout_sessions: 0,
    };
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.recap).toEqual([]);
  });

  it('rejects an unknown mood with 400 and writes nothing (test_nudge.py:639-643)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPost({ mood: 'fine' }, access);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ detail: 'Pick Rough, Meh, Okay, Good, or Great.' });
    expect(mockDb.eveningCheckIns[`${user.id}:2026-10-05`]).toBeUndefined();
  });

  it('rejects a note over 500 characters with 400 (evening_check_in.py:86-87)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPost({ mood: 'good', note: 'x'.repeat(501) }, access);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ detail: 'Keep the note short.' });
  });

  it('closes the day, stores the mood/note and returns the push-day preview (test_nudge.py:545-559)', async () => {
    const user = seedUser();
    mockDb.foodEntries.push({
      id: 1,
      date: '2026-10-05',
      meal_type: 'lunch',
      food_item: null,
      food_name: 'rice bowl',
      portion_g: null,
      calories: 500,
      protein_g: 20,
      carbs_g: 40,
      fat_g: 10,
      source: 'manual',
      ai_guess: null,
      created_at: '2026-10-05T12:00:00Z',
    });
    const { access } = issueTokenPair(user);

    const response = await callPost({ mood: 'good', note: 'kidney pain' }, access);
    const body = response.body as CloseBody;

    expect(response.status).toBe(200);
    expect(body.check_in).toEqual({ local_date: '2026-10-05', mood: 'good', closed: true });
    expect(body.preview).toEqual({
      eyebrow: 'Tomorrow, previewed',
      line: PREVIEW_PUSH_LINE,
      action: 'Good night',
    });
    expect(JSON.stringify(body)).not.toContain('kidney');
    expect(mockDb.eveningCheckIns[`${user.id}:2026-10-05`]).toEqual({
      local_date: '2026-10-05',
      mood: 'good',
      note: 'kidney pain',
    });
  });

  it('a rough close previews the smaller day (test_nudge.py:600-614)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPost({ mood: 'rough' }, access);
    const body = response.body as CloseBody;

    expect(body.preview).toEqual({
      eyebrow: 'Tomorrow, previewed',
      line: PREVIEW_SMALL_LINE,
      action: 'Good night',
    });
  });

  it('closing with nothing logged is honest: preview null, a real message (test_nudge.py:616-637)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPost({ mood: 'okay' }, access);
    const body = response.body as CloseBody;

    expect(body.preview).toBeNull();
    expect(body.message).toBe(NOTHING_TOMORROW);
  });

  it('a repeated POST the same local day overwrites rather than duplicating (test_nudge.py:639-651)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    await callPost({ mood: 'meh', note: 'a' }, access);
    await callPost({ mood: 'great', note: 'b' }, access);

    expect(mockDb.eveningCheckIns[`${user.id}:2026-10-05`]).toEqual({
      local_date: '2026-10-05',
      mood: 'great',
      note: 'b',
    });
  });

  it('GET reports closed: true with a preview right after a POST close', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    await callPost({ mood: 'rough' }, access);
    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.closed).toBe(true);
    expect(body.preview?.line).toBe(PREVIEW_SMALL_LINE);
  });

  it('an answered lock-screen evening_check_in notice also closes the in-app ritual, no EveningCheckIn row needed (test_nudge.py:260-281)', async () => {
    const user = seedUser();
    mockDb.deviceTokens.push({
      id: 'device-c',
      userId: user.id,
      token: 'device-c',
      platform: 'ios',
      created_at: '2026-10-05T00:00:00Z',
      updated_at: '2026-10-05T00:00:00Z',
    });
    mockDb.checkInNotices.push({
      id: 'notice-1',
      userId: user.id,
      kind: 'evening_check_in',
      title: 'Evening check-in',
      body: 'Twenty seconds.',
      time: '9:00 PM',
      actions: [
        { key: 'good', label: 'Good' },
        { key: 'rough', label: 'Rough' },
        { key: 'open', label: 'Open' },
      ],
      due_at: '2026-10-05T21:00:00Z',
      device_token_id: 'device-c',
      status: 'sent',
      error: '',
      sent_at: '2026-10-05T21:00:00Z',
      answer: 'rough',
      answered_at: '2026-10-05T21:00:00Z',
    });
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.closed).toBe(true);
    expect(body.preview?.line).toBe(PREVIEW_SMALL_LINE);
    expect(mockDb.eveningCheckIns[`${user.id}:2026-10-05`]).toBeUndefined();
  });

  it('does not close a new day from a notice answered after midnight for the prior day (evening_check_in.py:34-37)', async () => {
    jest.setSystemTime(new Date('2026-10-06T00:05:00Z')); // Tuesday just after midnight UTC
    const user = seedUser();
    mockDb.deviceTokens.push({
      id: 'device-cross-midnight',
      userId: user.id,
      token: 'device-cross-midnight',
      platform: 'ios',
      created_at: '2026-10-05T00:00:00Z',
      updated_at: '2026-10-05T00:00:00Z',
    });
    mockDb.checkInNotices.push({
      id: 'notice-cross-midnight',
      userId: user.id,
      kind: 'evening_check_in',
      title: 'Evening check-in',
      body: 'Twenty seconds.',
      time: '9:00 PM',
      actions: [],
      due_at: '2026-10-05T21:00:00Z',
      device_token_id: 'device-cross-midnight',
      status: 'sent',
      error: '',
      sent_at: '2026-10-05T21:00:00Z',
      answer: 'rough',
      answered_at: '2026-10-06T00:05:00Z',
    });
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.closed).toBe(false);
    expect(body.preview).toBeUndefined();
  });

  it('an unanswered lock-screen notice leaves the check-in open (test_nudge.py:283-301)', async () => {
    const user = seedUser();
    mockDb.deviceTokens.push({
      id: 'device-d',
      userId: user.id,
      token: 'device-d',
      platform: 'ios',
      created_at: '2026-10-05T00:00:00Z',
      updated_at: '2026-10-05T00:00:00Z',
    });
    mockDb.checkInNotices.push({
      id: 'notice-2',
      userId: user.id,
      kind: 'evening_check_in',
      title: 'Evening check-in',
      body: 'Twenty seconds.',
      time: '9:00 PM',
      actions: [],
      due_at: '2026-10-05T21:00:00Z',
      device_token_id: 'device-d',
      status: 'sent',
      error: '',
      sent_at: '2026-10-05T21:00:00Z',
      answer: null,
      answered_at: null,
    });
    const { access } = issueTokenPair(user);

    const response = await callGet(access);
    const body = response.body as RitualBody;

    expect(body.closed).toBe(false);
    expect(body.preview).toBeUndefined();
  });
});
