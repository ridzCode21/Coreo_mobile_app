/**
 * Issue #39 — mock-layer contract parity with `GET/PUT /users/me/fitness-profile/`
 * (`apps/users/urls.py:37`, view `apps/users/api/views/profile.py:137-149`, serializer
 * `apps/users/serializers.py:366-403`). Pattern mirrors `auth/profile-mock.test.ts`: dispatch
 * straight through `resolveMock`/`mockDb`, not through `apiClient`, so this protects the mock
 * handler itself, not just a hook built on top of it. Every assertion below mirrors a specific
 * backend test in `apps/users/test_fitness_profile.py`, cited per case.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

const URL = '/users/me/fitness-profile/';

const FULL = {
  fitness_goal: 'build_muscle',
  training_places: ['home_dumbbells_band', 'outdoors'],
  movement_note: '  Desk job, walk the dog twice a day, cricket on Sundays.  ',
  sports: ['cricket'],
  protected_areas: ['lower_back'],
};

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'fitness-user-1',
    email: 'fit@example.com',
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

describe('fitness mock: GET/PUT /users/me/fitness-profile/ (#39)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered for both methods', () => {
    expect(resolveMock('GET', URL)).toBeDefined();
    expect(resolveMock('PUT', URL)).toBeDefined();
  });

  it('returns 401 with no token on GET and PUT (test_requires_auth, test_fitness_profile.py:40-42)', async () => {
    expect((await callGet()).status).toBe(401);
    expect((await callPut(FULL)).status).toBe(401);
  });

  it('GET creates an empty profile the first time (test_get_creates_an_empty_profile, :44-49)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      fitness_interview_complete: false,
      fitness_goal: '',
      training_places: [],
      movement_note: '',
      sports: [],
      protected_areas: [],
    });
  });

  it('a full PUT stores every answer and completes (test_full_put_stores_every_answer_and_completes, :51-64)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(FULL, access);

    expect(response.status).toBe(200);
    const expected = {
      fitness_interview_complete: true,
      fitness_goal: 'build_muscle',
      training_places: ['home_dumbbells_band', 'outdoors'],
      movement_note: 'Desk job, walk the dog twice a day, cricket on Sundays.',
      sports: ['cricket'],
      protected_areas: ['lower_back'],
    };
    expect(response.body).toEqual(expected);
    expect((await callGet(access)).body).toEqual(expected);
  });

  it('a partial PUT changes only the field sent (test_partial_put_changes_only_the_field_sent, :66-76)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callPut(FULL, access);

    const response = await callPut({ sports: ['running', 'swimming'] }, access);

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body.sports).toEqual(['running', 'swimming']);
    expect(body.fitness_goal).toBe('build_muscle');
    expect(body.training_places).toEqual(['home_dumbbells_band', 'outdoors']);
    expect(body.protected_areas).toEqual(['lower_back']);
  });

  describe('invalid values 400 and save nothing (test_invalid_values_return_400_and_save_nothing, :78-97)', () => {
    const badBodies: Record<string, unknown>[] = [
      { fitness_goal: 'lose_weight' },
      { training_places: 'full_gym' },
      { training_places: [] },
      { training_places: ['moon'] },
      { training_places: ['full_gym', 'full_gym'] },
      { sports: ['chess'] },
      { protected_areas: ['elbows'] },
      { movement_note: 'x'.repeat(2001) },
      { fitness_goal: 'get_stronger', sports: [] },
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
        expect(stored.fitness_goal).toBe('build_muscle');
        expect(stored.sports).toEqual(['cricket']);
      },
    );
  });

  it('"Nothing regular" cannot combine with a sport (serializers.py:384-390)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut({ sports: ['nothing_regular', 'cricket'] }, access);

    expect(response.status).toBe(400);
    expect((response.body as Record<string, unknown>).sports).toEqual([
      '"Nothing regular" cannot be combined with a sport.',
    ]);
  });

  it('"Nothing to flag" cannot combine with an area (serializers.py:392-398)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut({ protected_areas: ['knees', 'nothing_to_flag'] }, access);

    expect(response.status).toBe(400);
    expect((response.body as Record<string, unknown>).protected_areas).toEqual([
      '"Nothing to flag" cannot be combined with an area.',
    ]);
  });

  it('each "nothing" choice stands alone fine in its own field (test_nothing_choices_stand_alone, :99-114)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(
      { sports: ['nothing_regular'], protected_areas: ['nothing_to_flag'] },
      access,
    );

    expect(response.status).toBe(200);
  });

  it('completion needs protected_areas but not the note (test_completion_needs_protect_but_not_the_note, :116-126)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const { protected_areas: _omit, ...withoutProtect } = FULL;
    await callPut({ ...withoutProtect, movement_note: '' }, access);

    let response = await callGet(access);
    expect((response.body as Record<string, unknown>).fitness_interview_complete).toBe(false);

    response = await callPut({ protected_areas: ['nothing_to_flag'] }, access);
    expect((response.body as Record<string, unknown>).fitness_interview_complete).toBe(true);
    expect((response.body as Record<string, unknown>).movement_note).toBe('');
  });

  it('a blank goal and note clear them and drop completion (test_blank_goal_and_note_clear_them, :128-136)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callPut(FULL, access);

    const response = await callPut({ fitness_goal: '', movement_note: '' }, access);

    expect(response.status).toBe(200);
    expect((response.body as Record<string, unknown>).fitness_goal).toBe('');
    expect((response.body as Record<string, unknown>).movement_note).toBe('');
    expect((response.body as Record<string, unknown>).fitness_interview_complete).toBe(false);
  });

  it('an empty PUT body is 400 with non_field_errors (test_empty_body_is_400, :138-142)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut({}, access);

    expect(response.status).toBe(400);
    expect((response.body as Record<string, unknown>).non_field_errors).toEqual([
      'Send at least one fitness answer.',
    ]);
  });
});
