import { registerMock } from '@/shared/api/mock/router';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleAError, styleAOk } from '@/shared/api/mock/envelope';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { serializeMockUser } from '@/features/auth/mocks/serializeUser';

function randomId(): string {
  return `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Mock `POST /users/register/` — API_REFERENCE.md §3. Real-shaped: Style A envelope, the same
 * validation rules a real backend would enforce (email format/uniqueness, password length,
 * password_confirm match, required names), real token issuance via `issueTokenPair`. Backs the
 * "Save your core" step (8a) and the mocked Apple/Google buttons on it — see
 * docs/implementation-plan.md §3. Registered at import time; see `registerAllMocks.ts`.
 */
registerMock('POST', '/users/register/', (request) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const email = asString(body.email).trim().toLowerCase();
  const password = asString(body.password);
  const passwordConfirm = asString(body.password_confirm);
  const firstName = asString(body.first_name).trim();
  const lastName = asString(body.last_name).trim();

  const details: Record<string, string[]> = {};
  if (!email || !email.includes('@')) {
    details.email = ['Enter a valid email.'];
  } else if (mockDb.users.some((user) => user.email === email)) {
    details.email = ['User with this email already exists.'];
  }
  if (!password || password.length < 8) {
    details.password = ['Password must be at least 8 characters.'];
  }
  if (password !== passwordConfirm) {
    details.password_confirm = ["Passwords don't match."];
  }
  if (!firstName) details.first_name = ['This field is required.'];
  if (!lastName) details.last_name = ['This field is required.'];

  if (Object.keys(details).length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid registration data', details),
    };
  }

  const now = new Date().toISOString();
  const user: MockUser = {
    id: randomId(),
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    phone: typeof body.phone === 'string' ? body.phone : null,
    date_of_birth: typeof body.date_of_birth === 'string' ? body.date_of_birth : null,
    gender: (body.gender as MockUser['gender']) ?? null,
    timezone: typeof body.timezone === 'string' ? body.timezone : 'UTC',
    is_premium: false,
    email_verified: false,
    phone_verified: false,
    created_at: now,
    updated_at: now,
  };
  mockDb.users.push(user);

  const tokens = issueTokenPair({ id: user.id, email: user.email });

  return {
    status: 201,
    delayMs: 500,
    body: styleAOk({ user: serializeMockUser(user), tokens }),
  };
});
