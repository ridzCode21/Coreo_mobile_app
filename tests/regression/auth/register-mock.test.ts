/**
 * Issue #8 — the mock `POST /users/register/` handler followed an older contract (only
 * email/password/name) while the real backend (apps/users/serializers.py:23-103
 * `UserRegistrationSerializer`, apps/users/services/onboarding.py:5-48) requires `goal` and
 * `active_pillars`, rejects anything outside the six interview goals (`goal_type` values outside
 * `INTERVIEW_GOALS`, e.g. the diet-only `maintain`/`gain_muscle`/`manage_condition`), validates
 * `active_pillars` the same way `clean_active_pillars` does, and requires `age`/`height_cm`/
 * `weight_kg`/`gender` only when `diet` is picked. A valid body always comes back with
 * `onboarding_complete: true` (apps/users/services/onboarding.py:19-36 `onboarding_is_complete` —
 * every condition it checks is already enforced by the serializer's own `validate()`, see
 * serializers.py:80-103, so a body that reaches 201 always satisfies it). This keeps the mock
 * honest with that contract.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';

type RegisterEnvelope = {
  success: boolean;
  data?: { user: Record<string, unknown>; tokens: Record<string, unknown> };
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
};

function callRegister(body: unknown): MockResponse | Promise<MockResponse> {
  const match = resolveMock('POST', '/users/register/');
  if (!match) throw new Error('POST /users/register/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/users/register/',
    params: match.params,
    query: {},
    headers: {},
    body,
  };
  return match.handler(request);
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'maya@example.com',
    password: 'quiet-harbor-42',
    password_confirm: 'quiet-harbor-42',
    first_name: 'Maya',
    goal: 'lose_weight',
    active_pillars: ['diet'],
    age: 34,
    height_cm: 178,
    weight_kg: 74,
    gender: 'female',
    ...overrides,
  };
}

async function validationDetails(body: unknown): Promise<Record<string, string[]>> {
  const response = (await callRegister(body)) as { status: number; body: RegisterEnvelope };
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  return response.body.error?.details ?? {};
}

describe('auth mock: POST /users/register/ onboarding contract (issue #8)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('rejects a body missing required field goal', async () => {
    const details = await validationDetails(validBody({ goal: undefined }));
    expect(details.goal).toBeDefined();
  });

  it('rejects a body missing required field active_pillars', async () => {
    const details = await validationDetails(validBody({ active_pillars: undefined }));
    expect(details.active_pillars).toBeDefined();
  });

  it('rejects empty active_pillars like clean_active_pillars', async () => {
    const details = await validationDetails(validBody({ active_pillars: [] }));
    expect(details.active_pillars).toBeDefined();
  });

  it('rejects repeated active_pillars like clean_active_pillars', async () => {
    const details = await validationDetails(validBody({ active_pillars: ['diet', 'diet'] }));
    expect(details.active_pillars).toBeDefined();
  });

  it('rejects unknown active_pillars like clean_active_pillars', async () => {
    const details = await validationDetails(validBody({ active_pillars: ['sleep'] }));
    expect(details.active_pillars).toBeDefined();
  });

  it('rejects a legacy profile goal that is not an interview registration goal', async () => {
    const details = await validationDetails(validBody({ goal: 'maintain' }));
    expect(details.goal).toBeDefined();
  });

  it('requires age when Diet is selected', async () => {
    const details = await validationDetails(validBody({ age: undefined }));
    expect(details.age).toBeDefined();
  });

  it('requires height_cm when Diet is selected', async () => {
    const details = await validationDetails(validBody({ height_cm: undefined }));
    expect(details.height_cm).toBeDefined();
  });

  it('requires weight_kg when Diet is selected', async () => {
    const details = await validationDetails(validBody({ weight_kg: undefined }));
    expect(details.weight_kg).toBeDefined();
  });

  it('requires gender when Diet is selected', async () => {
    const details = await validationDetails(validBody({ gender: undefined }));
    expect(details.gender).toBeDefined();
  });

  it('allows Fitness-only registration without body fields or last_name', async () => {
    const response = (await callRegister({
      email: 'sam@example.com',
      password: 'quiet-harbor-42',
      password_confirm: 'quiet-harbor-42',
      first_name: 'Sam',
      goal: 'get_stronger',
      active_pillars: ['fitness'],
    })) as { status: number; body: RegisterEnvelope };

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.user).toEqual(
      expect.objectContaining({
        email: 'sam@example.com',
        last_name: '',
        onboarding_complete: true,
      }),
    );
  });

  it('persists a valid all-three interview in the mock and returns a complete user', async () => {
    const response = (await callRegister(
      validBody({ active_pillars: ['diet', 'fitness', 'wellness'], goal: 'more_energy' }),
    )) as { status: number; body: RegisterEnvelope };

    expect(response.status).toBe(201);
    expect(response.body.data?.user.age).toBe(34);
    expect(response.body.data?.user.gender).toBe('female');
    expect(response.body.data?.user.onboarding_complete).toBe(true);
    expect(mockDb.users).toHaveLength(1);
  });
});
