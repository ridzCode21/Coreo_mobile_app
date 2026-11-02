/**
 * Issue #166 — the mock `POST /users/register/` handler only checked password length
 * (`password.length < 8`), so an all-digit password like `12345678` (8 chars) sailed through and
 * created an account — nothing like the real backend. The real `UserRegistrationSerializer`
 * (apps/users/serializers.py:110) runs Django's `validate_password` with the project's configured
 * validators (med_app/settings.py:257-270): `MinimumLengthValidator` (already covered by the
 * field-level `min_length=8` on the `password` field, serializers.py:38-40, which fails before
 * `validate()` ever runs and so still reports under `password`), `UserAttributeSimilarityValidator`
 * and `CommonPasswordValidator` (not emulated here — there is no safe, non-invented way to
 * reproduce Django's common-password wordlist in the mock; see plan.md "Out of scope"), and
 * `NumericPasswordValidator`, whose exact message ("This password is entirely numeric.") this test
 * locks in. Because `validate_password` is called from the serializer's whole-object `validate()`
 * (not a per-field `validate_<name>`), DRF's `as_serializer_error` has no field to attach it to and
 * reports it under `non_field_errors` — confirmed against apps/users/serializers.py:98-119, where
 * every other `validate()` failure (password_confirm mismatch, diet-required fields) raises a
 * dict keyed to its own field.
 */

import '@/shared/api/mock/registerAllMocks';
import { __resetMockDbForTests } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';

type RegisterEnvelope = {
  success: boolean;
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
};

type RegisterResponse = MockResponse & { body: RegisterEnvelope };

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'maya@example.com',
    password: 'quiet-harbor-42',
    password_confirm: 'quiet-harbor-42',
    first_name: 'Maya',
    goal: 'get_stronger',
    active_pillars: ['fitness'],
    ...overrides,
  };
}

async function callRegister(body: unknown): Promise<RegisterResponse> {
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
  return (await match.handler(request)) as RegisterResponse;
}

describe('auth mock: POST /users/register/ weak-password rejection (issue #166)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('rejects an all-digit 8-character password under non_field_errors, like the real backend', async () => {
    const response = await callRegister(
      validBody({ password: '12345678', password_confirm: '12345678' }),
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.non_field_errors).toEqual([
      'This password is entirely numeric.',
    ]);
    expect(response.body.error?.details?.password).toBeUndefined();
  });

  it('still rejects a too-short password under the password field (unchanged)', async () => {
    const response = await callRegister(
      validBody({ password: 'short1', password_confirm: 'short1' }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error?.details?.password).toBeDefined();
    expect(response.body.error?.details?.non_field_errors).toBeUndefined();
  });

  it('accepts a strong, non-numeric password of the same length (unchanged)', async () => {
    const response = await callRegister(
      validBody({ password: 'Quiet-Harbor-8', password_confirm: 'Quiet-Harbor-8' }),
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('checks password_confirm match before the numeric-password check, like the real validate() order', async () => {
    // serializers.py:101-110 — password_confirm mismatch is raised before validate_password runs.
    const response = await callRegister(
      validBody({ password: '12345678', password_confirm: 'different' }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error?.details?.password_confirm).toEqual(['Passwords do not match.']);
    expect(response.body.error?.details?.non_field_errors).toBeUndefined();
  });
});
