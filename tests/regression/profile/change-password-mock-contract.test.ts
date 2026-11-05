/**
 * Issue #177 — mock for `POST /users/password-change/`, matching the real backend code exactly:
 * `apps/users/api/views/password.py:92-109` (`password_change`) and
 * `apps/users/serializers.py:557-577` (`PasswordChangeSerializer`), with the 4
 * `AUTH_PASSWORD_VALIDATORS` from `med_app/settings.py:257-270` (scoped per plan.md Decision log
 * #7: the mock implements the numeric-only and a small common-password list — including the
 * literal `"12345678"` string the issue's "How to verify" step names — plus length and basic
 * similarity checks, not Django's full common-password corpus). Calls the handler directly, same
 * pattern as `account-mock-contract.test.ts`.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'password-user-1',
    email: 'priya@example.com',
    password: 'correct-horse-battery',
    first_name: 'Priya',
    last_name: 'Shah',
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
  return { params: {}, query: {}, headers: {}, body: undefined, ...overrides };
}

function call(path: string, body: Record<string, unknown>, token?: string) {
  const match = resolveMock('POST', path);
  if (!match) throw new Error(`POST ${path} is not registered`);
  return match.handler(
    request({
      method: 'POST',
      path,
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

describe('profile mocks: POST /users/password-change/ (issue #177, password.py:92-109)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns 401 with no token', async () => {
    const response = await call('/users/password-change/', {
      current_password: 'x',
      new_password: 'newlongpass1',
      new_password_confirm: 'newlongpass1',
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 with current_password error on the wrong current password (serializers.py:564-569)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/users/password-change/',
      {
        current_password: 'wrong-password',
        new_password: 'newlongpass1',
        new_password_confirm: 'newlongpass1',
      },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as {
      success: false;
      error: { code: string; details: Record<string, string[]> };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.current_password).toEqual(['Current password is incorrect.']);
  });

  it('returns 400 with new_password_confirm error on a mismatch (serializers.py:571-574)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/users/password-change/',
      {
        current_password: 'correct-horse-battery',
        new_password: 'newlongpass1',
        new_password_confirm: 'somethingelse1',
      },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as { error: { details: Record<string, string[]> } };
    expect(body.error.details.new_password_confirm).toEqual(['Passwords do not match.']);
  });

  it('returns 400 with non_field_errors for "12345678" (numeric + common, settings.py:257-270)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/users/password-change/',
      {
        current_password: 'correct-horse-battery',
        new_password: '12345678',
        new_password_confirm: '12345678',
      },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as { error: { details: Record<string, string[]> } };
    expect(body.error.details.non_field_errors).toBeDefined();
    const reasons = body.error.details.non_field_errors.join(' ');
    expect(reasons).toMatch(/common/i);
    expect(reasons).toMatch(/numeric/i);
  });

  it('returns 400 with a length error for a new password under 8 characters', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/users/password-change/',
      {
        current_password: 'correct-horse-battery',
        new_password: 'short1',
        new_password_confirm: 'short1',
      },
      access,
    );

    expect(response.status).toBe(400);
  });

  it('on success, returns 200 and the stored password actually changes', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/users/password-change/',
      {
        current_password: 'correct-horse-battery',
        new_password: 'brandnewpass1',
        new_password_confirm: 'brandnewpass1',
      },
      access,
    );

    expect(response.status).toBe(200);
    const body = response.body as { success: true; message: string };
    expect(body.success).toBe(true);

    const stored = mockDb.users.find((candidate) => candidate.id === user.id);
    expect(stored?.password).toBe('brandnewpass1');

    const retryWithOldPassword = await call(
      '/users/password-change/',
      {
        current_password: 'correct-horse-battery',
        new_password: 'anotherlongpass1',
        new_password_confirm: 'anotherlongpass1',
      },
      access,
    );
    expect(retryWithOldPassword.status).toBe(400);
  });
});
