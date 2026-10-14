/**
 * Issue #15 — mock `POST /users/password-reset/` and `POST /users/password-reset/confirm/`,
 * matching apps/users/api/views/password.py:21-45,48-85 and
 * apps/users/services/password_reset.py (token is one-time use, expires in 1 hour) and
 * apps/users/serializers.py:204-220 `PasswordResetConfirmSerializer` (match is checked before
 * strength; a bad/expired/spent token is `INVALID_TOKEN` only once the body itself is valid).
 * `password-reset` never reveals whether the address has an account (no user enumeration,
 * API_REFERENCE.md §7) — same 200 either way.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';
import { __latestPasswordResetTokenForTests } from '@/features/auth/mocks/passwordResetTokens';

type Envelope = {
  success: boolean;
  message?: string;
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
};

function call(path: string, body: unknown): MockResponse | Promise<MockResponse> {
  const match = resolveMock('POST', path);
  if (!match) throw new Error(`POST ${path} is not registered`);
  const request: MockRequest = {
    method: 'POST',
    path,
    params: match.params,
    query: {},
    headers: {},
    body,
  };
  return match.handler(request);
}

function requestReset(body: unknown) {
  return call('/users/password-reset/', body) as Promise<{ status: number; body: Envelope }>;
}

function confirmReset(body: unknown) {
  return call('/users/password-reset/confirm/', body) as Promise<{
    status: number;
    body: Envelope;
  }>;
}

async function registerUser(email: string, password = 'old-quiet-harbor-1') {
  const registerMatch = resolveMock('POST', '/users/register/');
  if (!registerMatch) throw new Error('POST /users/register/ is not registered');
  await registerMatch.handler({
    method: 'POST',
    path: '/users/register/',
    params: {},
    query: {},
    headers: {},
    body: {
      email,
      password,
      password_confirm: password,
      first_name: 'Maya',
      goal: 'lose_weight',
      active_pillars: ['fitness'],
    },
  });
}

describe('auth mock: POST /users/password-reset/ (issue #15)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('always returns the same 200 success message for a known address', async () => {
    await registerUser('maya@example.com');
    const response = await requestReset({ email: 'maya@example.com' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'If the email exists, a password reset email has been sent',
    });
  });

  it('returns the exact same response for an unknown address (no user enumeration)', async () => {
    const response = await requestReset({ email: 'nobody@example.com' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'If the email exists, a password reset email has been sent',
    });
  });

  it('400s a malformed email', async () => {
    const response = await requestReset({ email: 'not-an-email' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.email).toBeDefined();
  });

  it('issues a token for a known address, retrievable by the test helper', async () => {
    await registerUser('maya@example.com');
    await requestReset({ email: 'maya@example.com' });
    expect(__latestPasswordResetTokenForTests('maya@example.com')).toEqual(expect.any(String));
  });

  it('matches a known address case-insensitively when issuing a token', async () => {
    await registerUser('maya@example.com');
    await requestReset({ email: 'Maya@Example.com' });
    expect(__latestPasswordResetTokenForTests('maya@example.com')).toEqual(expect.any(String));
  });

  it('issues no token for an unknown address', async () => {
    await requestReset({ email: 'nobody@example.com' });
    expect(__latestPasswordResetTokenForTests('nobody@example.com')).toBeUndefined();
  });
});

describe('auth mock: POST /users/password-reset/confirm/ (issue #15)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  async function issuedToken(email = 'maya@example.com') {
    await registerUser(email);
    await requestReset({ email });
    const token = __latestPasswordResetTokenForTests(email);
    if (!token) throw new Error('expected a token to have been issued');
    return token;
  }

  it('resets the password on a valid token and signs in with it afterwards', async () => {
    const token = await issuedToken('maya@example.com');

    const response = await confirmReset({
      token,
      new_password: 'brand-new-harbor-7',
      new_password_confirm: 'brand-new-harbor-7',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Password reset successful' });
    const user = mockDb.users.find((candidate) => candidate.email === 'maya@example.com');
    expect(user?.password).toBe('brand-new-harbor-7');
  });

  it('spends the token — a second use is INVALID_TOKEN', async () => {
    const token = await issuedToken('maya@example.com');
    await confirmReset({
      token,
      new_password: 'brand-new-harbor-7',
      new_password_confirm: 'brand-new-harbor-7',
    });

    const second = await confirmReset({
      token,
      new_password: 'another-harbor-9',
      new_password_confirm: 'another-harbor-9',
    });

    expect(second.status).toBe(400);
    expect(second.body.error?.code).toBe('INVALID_TOKEN');
    expect(second.body.error?.message).toBe('Password reset token is invalid or expired');
  });

  it('rejects a garbage token as INVALID_TOKEN', async () => {
    const response = await confirmReset({
      token: 'not-a-real-token',
      new_password: 'brand-new-harbor-7',
      new_password_confirm: 'brand-new-harbor-7',
    });
    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token as INVALID_TOKEN', async () => {
    const token = await issuedToken('maya@example.com');
    mockDb.passwordResetTokens[token].expiresAt = Date.now() - 1000;

    const response = await confirmReset({
      token,
      new_password: 'brand-new-harbor-7',
      new_password_confirm: 'brand-new-harbor-7',
    });
    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('INVALID_TOKEN');
  });

  it('checks the password match before touching the token (bad body never spends a good token)', async () => {
    const token = await issuedToken('maya@example.com');

    const response = await confirmReset({
      token,
      new_password: 'brand-new-harbor-7',
      new_password_confirm: 'typo-oops-99',
    });

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.new_password_confirm).toEqual(['Passwords do not match.']);
    expect(mockDb.passwordResetTokens[token].used).toBe(false);
  });

  it('rejects a new password under 8 characters', async () => {
    const token = await issuedToken('maya@example.com');

    const response = await confirmReset({
      token,
      new_password: 'short',
      new_password_confirm: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    expect(response.body.error?.details?.new_password).toBeDefined();
  });
});
