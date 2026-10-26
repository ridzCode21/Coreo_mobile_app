/**
 * Issue #41 — mock-layer contract parity with `GET/PUT /users/me/wellness-profile/`
 * (`apps/users/urls.py:35`, view `apps/users/api/views/profile.py:152-164`, serializer
 * `apps/users/serializers.py:406-442`). Pattern mirrors `fitness/fitness-profile-mock.test.ts`:
 * dispatch straight through `resolveMock`/`mockDb`, not through `apiClient`. Every assertion below
 * mirrors a specific backend test in `apps/users/test_wellness_profile.py`, cited per case.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

const URL = '/users/me/wellness-profile/';

const FULL = {
  wellness_focus: 'racing_mind',
  nights_note: '  In bed by 11:30 but on the phone till 1.  ',
  morning_first: 'phone',
  what_helps: ['walks', 'chai'],
  check_in_style: 'step_in',
  hide_numbers: true,
};

const EMPTY = {
  wellness_interview_complete: false,
  wellness_focus: '',
  nights_note: '',
  nights_tags: [],
  morning_first: '',
  what_helps: [],
  check_in_style: '',
  hide_numbers: false,
};

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'wellness-user-1',
    email: 'well@example.com',
    password: 'unused',
    first_name: 'Well',
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

async function callPut(body: unknown, token?: string) {
  const match = resolveMock('PUT', URL);
  if (!match) throw new Error(`PUT ${URL} is not registered`);
  return match.handler(
    request({
      method: 'PUT',
      path: URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
}

describe('wellness mock: GET/PUT /users/me/wellness-profile/ (#41)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered for both methods', () => {
    expect(resolveMock('GET', URL)).toBeDefined();
    expect(resolveMock('PUT', URL)).toBeDefined();
  });

  it('returns 401 with no token on GET and PUT (test_requires_auth, test_wellness_profile.py:42-44)', async () => {
    expect((await callGet()).status).toBe(401);
    expect((await callPut(FULL)).status).toBe(401);
  });

  it('GET creates an empty profile the first time (test_get_creates_an_empty_profile, :46-51)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(EMPTY);
  });

  it('a full PUT stores every answer and completes (test_full_put_stores_every_answer_and_completes, :53-67)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(FULL, access);

    expect(response.status).toBe(200);
    const expected = {
      wellness_interview_complete: true,
      wellness_focus: 'racing_mind',
      nights_note: 'In bed by 11:30 but on the phone till 1.',
      nights_tags: [],
      morning_first: 'phone',
      what_helps: ['walks', 'chai'],
      check_in_style: 'step_in',
      hide_numbers: true,
    };
    expect(response.body).toEqual(expected);
    expect((await callGet(access)).body).toEqual(expected);
  });

  it('a partial PUT changes only the field sent (test_partial_put_changes_only_the_field_sent, :69-79)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callPut(FULL, access);

    const response = await callPut({ what_helps: ['music', 'prayer'] }, access);

    expect(response.status).toBe(200);
    const body = (await callGet(access)).body as Record<string, unknown>;
    expect(body.what_helps).toEqual(['music', 'prayer']);
    expect(body.wellness_focus).toBe('racing_mind');
    expect(body.check_in_style).toBe('step_in');
    expect(body.hide_numbers).toBe(true);
  });

  describe('invalid values 400 and save nothing (test_invalid_values_return_400_and_save_nothing, :81-101)', () => {
    const badBodies: Record<string, unknown>[] = [
      { wellness_focus: 'anxiety' },
      { morning_first: 'yoga' },
      { check_in_style: 'always' },
      { what_helps: 'walks' },
      { what_helps: [] },
      { what_helps: ['naps'] },
      { what_helps: ['walks', 'walks'] },
      { nights_note: 'x'.repeat(2001) },
      { hide_numbers: 'maybe' },
      { wellness_focus: 'sleep', what_helps: [] },
    ];

    it.each(badBodies)(
      'rejects %j with 400 and leaves the stored profile untouched',
      async (body) => {
        const user = seedUser();
        const { access } = issueTokenPair(user);
        await callPut(FULL, access);

        const response = await callPut(body, access);

        expect(response.status).toBe(400);
        const stored = (await callGet(access)).body as Record<string, unknown>;
        expect(stored.wellness_focus).toBe('racing_mind');
        expect(stored.what_helps).toEqual(['walks', 'chai']);
      },
    );
  });

  it('"Haven\'t found it" cannot combine with another help (test_havent_found_it_stands_alone, :103-113)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const combined = await callPut({ what_helps: ['havent_found_it', 'walks'] }, access);
    expect(combined.status).toBe(400);
    expect((combined.body as Record<string, unknown>).what_helps).toEqual([
      '"Haven\'t found it" cannot be combined with another help.',
    ]);

    const alone = await callPut({ what_helps: ['havent_found_it'] }, access);
    expect(alone.status).toBe(200);
    expect((alone.body as Record<string, unknown>).what_helps).toEqual(['havent_found_it']);
  });

  it('completion needs check_in_style but not the note (test_completion_needs_check_in_style_but_not_the_note, :115-127)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const { check_in_style: _omit, ...withoutCheckIn } = FULL;
    await callPut({ ...withoutCheckIn, nights_note: '', hide_numbers: false }, access);

    let response = await callGet(access);
    expect((response.body as Record<string, unknown>).wellness_interview_complete).toBe(false);

    response = await callPut({ check_in_style: 'only_when_i_come' }, access);
    expect((response.body as Record<string, unknown>).wellness_interview_complete).toBe(true);
    expect((response.body as Record<string, unknown>).nights_note).toBe('');
    expect((response.body as Record<string, unknown>).hide_numbers).toBe(false);
  });

  it('hide_numbers can be on with step_in (test_hide_numbers_can_be_on_with_step_in, :129-134)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(FULL, access);

    expect((response.body as Record<string, unknown>).hide_numbers).toBe(true);
    expect((response.body as Record<string, unknown>).check_in_style).toBe('step_in');
  });

  it('blank choices clear them and drop completion (test_blank_choices_clear_them, :136-144)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callPut(FULL, access);

    const response = await callPut(
      { wellness_focus: '', nights_note: '', check_in_style: '' },
      access,
    );

    expect(response.status).toBe(200);
    expect((response.body as Record<string, unknown>).wellness_focus).toBe('');
    expect((response.body as Record<string, unknown>).nights_note).toBe('');
    expect((response.body as Record<string, unknown>).check_in_style).toBe('');
    expect((response.body as Record<string, unknown>).wellness_interview_complete).toBe(false);
  });

  it('an empty PUT body is 400 with non_field_errors (test_empty_body_is_400, :146-150)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut({}, access);

    expect(response.status).toBe(400);
    expect((response.body as Record<string, unknown>).non_field_errors).toEqual([
      'Send at least one wellness answer.',
    ]);
  });
});
