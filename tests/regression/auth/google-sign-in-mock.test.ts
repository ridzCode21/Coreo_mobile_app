/**
 * Issue #13 — mock `POST /users/google/`, matching the real backend contract read from the
 * snapshot: apps/users/api/views/auth.py:194-200 (`user_google`) and :153-182
 * (`_provider_sign_in`), apps/users/services/provider_accounts.py:26-72
 * (`continue_with_provider`), apps/users/serializers.py:150-193 (`ProviderInterviewSerializer`).
 * The real endpoint verifies a signed Google ID token server-side; the mock stands that in with
 * `googleMockToken`'s opaque encode/decode pair (see google-identity.test.ts) so it can still
 * reject a missing/garbage token the same way `verify_provider_token` would reject a malformed
 * JWT.
 */
import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';
import { encodeMockGoogleIdentityToken } from '@/features/auth/lib/googleMockToken';

type GoogleEnvelope = {
  success: boolean;
  message?: string;
  data?: { user: Record<string, unknown>; tokens: Record<string, unknown> };
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
};

function callGoogle(body: unknown): MockResponse | Promise<MockResponse> {
  const match = resolveMock('POST', '/users/google/');
  if (!match) throw new Error('POST /users/google/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/users/google/',
    params: match.params,
    query: {},
    headers: {},
    body,
  };
  return match.handler(request);
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    identity_token: encodeMockGoogleIdentityToken({ firstName: 'Maya', lastName: 'Chen' }),
    first_name: 'Maya',
    last_name: 'Chen',
    goal: 'lose_weight',
    active_pillars: ['diet'],
    age: 34,
    height_cm: 178,
    weight_kg: 74,
    gender: 'female',
    ...overrides,
  };
}

describe('auth mock: POST /users/google/ provider contract (issue #13)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('rejects a missing identity_token as a validation error, like the real service (400 before verification)', async () => {
    const response = (await callGoogle(validBody({ identity_token: undefined }))) as {
      status: number;
      body: GoogleEnvelope;
    };
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.identity_token).toBeDefined();
  });

  it('rejects a garbage identity_token the mock codec cannot decode', async () => {
    const response = (await callGoogle(validBody({ identity_token: 'not-a-real-token' }))) as {
      status: number;
      body: GoogleEnvelope;
    };
    expect(response.status).toBe(401);
    expect(response.body.error?.code).toBe('INVALID_PROVIDER_TOKEN');
  });

  it('creates a new user and returns 201 Registration successful for a first-time Google identity', async () => {
    const response = (await callGoogle(validBody())) as { status: number; body: GoogleEnvelope };

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Registration successful');
    expect(response.body.data?.user).toEqual(
      expect.objectContaining({ first_name: 'Maya', last_name: 'Chen' }),
    );
    expect(response.body.data?.tokens).toEqual(
      expect.objectContaining({ access: expect.any(String), refresh: expect.any(String) }),
    );
    expect(mockDb.users).toHaveLength(1);
  });

  it('signs the same Google identity back in on a second call instead of creating a duplicate', async () => {
    const token = encodeMockGoogleIdentityToken({ firstName: 'Maya', lastName: 'Chen' });
    const first = (await callGoogle(validBody({ identity_token: token }))) as {
      status: number;
      body: GoogleEnvelope;
    };
    expect(first.status).toBe(201);

    const second = (await callGoogle(validBody({ identity_token: token }))) as {
      status: number;
      body: GoogleEnvelope;
    };
    expect(second.status).toBe(200);
    expect(second.body.message).toBe('Login successful');
    expect(second.body.data?.user.id).toBe(first.body.data?.user.id);
    expect(mockDb.users).toHaveLength(1);
  });

  it('rejects a Google email already used by a different account, like ProviderEmailTaken', async () => {
    mockDb.users.push({
      id: 'usr_existing',
      email: 'already.taken@example.com',
      password: 'whatever12',
      first_name: 'Someone',
      last_name: 'Else',
      phone: null,
      date_of_birth: null,
      gender: null,
      timezone: 'UTC',
      is_premium: false,
      email_verified: true,
      phone_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const response = (await callGoogle(
      validBody({
        identity_token: encodeMockGoogleIdentityToken({
          firstName: 'Maya',
          lastName: 'Chen',
          email: 'already.taken@example.com',
        }),
      }),
    )) as { status: number; body: GoogleEnvelope };

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.email).toEqual(
      expect.arrayContaining([expect.stringContaining('already exists')]),
    );
  });

  it('requires age, height, weight and gender when diet is an active pillar, like the real serializer', async () => {
    const response = (await callGoogle(
      validBody({ age: undefined, height_cm: undefined, weight_kg: undefined, gender: undefined }),
    )) as { status: number; body: GoogleEnvelope };

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.age).toBeDefined();
    expect(response.body.error?.details?.height_cm).toBeDefined();
    expect(response.body.error?.details?.weight_kg).toBeDefined();
    expect(response.body.error?.details?.gender).toBeDefined();
  });

  it('allows a Fitness-only identity without diet basics', async () => {
    const response = (await callGoogle(
      validBody({
        active_pillars: ['fitness'],
        goal: 'get_stronger',
        age: undefined,
        height_cm: undefined,
        weight_kg: undefined,
        gender: undefined,
      }),
    )) as { status: number; body: GoogleEnvelope };

    expect(response.status).toBe(201);
    expect(response.body.data?.user).toEqual(expect.objectContaining({ first_name: 'Maya' }));
  });
});
