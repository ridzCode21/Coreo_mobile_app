/**
 * Issue #30 — contract parity: `PUT /users/me/diet-profile/`'s mock must accept and round-trip
 * `target_weight_kg`, `pace`, `who_cooks`, `meal_rhythm`, and `weak_moment`, matching
 * `DietProfileSerializer` on the real backend (backend/apps/users/serializers.py:233-298,
 * fields list `:254-283`). These fields were entirely absent from the mock before this issue.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';

const URL = '/users/me/diet-profile/';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'diet-user-1',
    email: 'diet@example.com',
    password: 'unused',
    first_name: 'Diet',
    last_name: 'Tester',
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

async function callPut(token: string, body: Record<string, unknown>) {
  const match = resolveMock('PUT', URL);
  if (!match) throw new Error(`PUT ${URL} is not registered`);
  return match.handler(
    request({
      method: 'PUT',
      path: URL,
      headers: { Authorization: `Bearer ${token}` },
      body,
    }),
  );
}

async function callGet(token: string) {
  const match = resolveMock('GET', URL);
  if (!match) throw new Error(`GET ${URL} is not registered`);
  return match.handler(
    request({ method: 'GET', path: URL, headers: { Authorization: `Bearer ${token}` } }),
  );
}

describe('nutrition mock: PUT /users/me/diet-profile/ accepts the issue #30 fields', () => {
  afterEach(() => {
    __resetMockDbForTests();
  });

  it('GET defaults pace/who_cooks/meal_rhythm/weak_moment to null before any PUT', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      pace: null,
      who_cooks: null,
      meal_rhythm: null,
      weak_moment: null,
    });
  });

  it('round-trips target_weight_kg and pace in the PUT response', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(access, { target_weight_kg: 72, pace: 'steady' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ target_weight_kg: 72, pace: 'steady' });
  });

  it('accepts an explicit null target weight, as the nullable backend field does', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(access, { target_weight_kg: null });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ target_weight_kg: null });
  });

  it('round-trips who_cooks and meal_rhythm in the PUT response', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(access, {
      who_cooks: 'family_cooks',
      meal_rhythm: 'three_meals',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ who_cooks: 'family_cooks', meal_rhythm: 'three_meals' });
  });

  it('round-trips weak_moment in the PUT response', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callPut(access, { weak_moment: 'late_night_snacks' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ weak_moment: 'late_night_snacks' });
  });

  it('persists all five fields so a later GET returns the same values', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    await callPut(access, {
      target_weight_kg: 65,
      pace: 'push',
      who_cooks: 'house_help',
      meal_rhythm: 'grazing',
      weak_moment: 'stress_eating',
    });

    const getResponse = await callGet(access);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      target_weight_kg: 65,
      pace: 'push',
      who_cooks: 'house_help',
      meal_rhythm: 'grazing',
      weak_moment: 'stress_eating',
    });
  });

  it('GET includes a late_night_guard object by default, matching the real response shape', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      late_night_guard: expect.objectContaining({
        enabled: expect.any(Boolean),
        check_in_time: expect.any(String),
        status_line: expect.any(String),
      }),
    });
  });
});
