import { registerMock } from '@/shared/api/mock/router';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleAError, styleAOk } from '@/shared/api/mock/envelope';
import { blacklistMockToken, issueTokenPair, verifyMockToken } from '@/shared/api/mock/tokens';
import { ACTIVE_PILLARS, GENDERS, INTERVIEW_GOALS } from '@/shared/types/user';
import { serializeMockUser } from '@/features/auth/mocks/serializeUser';

function randomId(): string {
  return `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAllowedValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

/**
 * Mock `POST /users/register/` — API_REFERENCE.md §3. Real-shaped: Style A envelope, the same
 * validation rules a real backend would enforce (email format/uniqueness, password length,
 * password_confirm match, required first name), real token issuance via `issueTokenPair`. Backs the
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
  const activePillars = body.active_pillars;
  const pillarList = Array.isArray(activePillars) ? activePillars : null;

  const details: Record<string, string[]> = {};
  if (!email || !email.includes('@')) {
    details.email = ['Enter a valid email.'];
  } else if (mockDb.users.some((user) => user.email === email)) {
    details.email = ['User with this email already exists.'];
  }
  if (!password || password.length < 8) {
    details.password = ['Password must be at least 8 characters.'];
  }
  if (!firstName) details.first_name = ['This field is required.'];
  if (!isAllowedValue(INTERVIEW_GOALS, body.goal)) {
    details.goal = ['Select a valid choice.'];
  }
  if (!pillarList) {
    details.active_pillars = ['Pillars must be a list.'];
  } else if (pillarList.length === 0) {
    details.active_pillars = ['Pick at least one pillar.'];
  } else if (pillarList.some((pillar) => !isAllowedValue(ACTIVE_PILLARS, pillar))) {
    details.active_pillars = ['Pillars must be diet, fitness, or wellness.'];
  } else if (pillarList.length !== new Set(pillarList).size) {
    details.active_pillars = ['Pillars cannot be repeated.'];
  }

  if (
    body.age !== undefined &&
    body.age !== null &&
    (!Number.isInteger(body.age) || (body.age as number) < 1 || (body.age as number) > 120)
  ) {
    details.age = ['Ensure this value is between 1 and 120.'];
  }
  if (
    body.height_cm !== undefined &&
    body.height_cm !== null &&
    (typeof body.height_cm !== 'number' || !Number.isFinite(body.height_cm))
  ) {
    details.height_cm = ['A valid number is required.'];
  }
  if (
    body.weight_kg !== undefined &&
    body.weight_kg !== null &&
    (typeof body.weight_kg !== 'number' || !Number.isFinite(body.weight_kg) || body.weight_kg < 0)
  ) {
    details.weight_kg = ['Ensure this value is greater than or equal to 0.'];
  }
  if (body.gender !== undefined && body.gender !== '' && !isAllowedValue(GENDERS, body.gender)) {
    details.gender = ['Select a valid choice.'];
  }

  if (Object.keys(details).length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid registration data', details),
    };
  }

  if (password !== passwordConfirm) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid registration data', {
        password_confirm: ['Passwords do not match.'],
      }),
    };
  }

  if (pillarList?.includes('diet')) {
    if (body.age === undefined || body.age === null || body.age === '') {
      details.age = ['This field is required when diet is selected.'];
    }
    if (body.height_cm === undefined || body.height_cm === null || body.height_cm === '') {
      details.height_cm = ['This field is required when diet is selected.'];
    }
    if (body.weight_kg === undefined || body.weight_kg === null || body.weight_kg === '') {
      details.weight_kg = ['This field is required when diet is selected.'];
    }
    if (body.gender === undefined || body.gender === null || body.gender === '') {
      details.gender = ['This field is required when diet is selected.'];
    }
  }

  if (Object.keys(details).length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid registration data', details),
    };
  }

  const now = new Date().toISOString();
  const age = typeof body.age === 'number' ? body.age : null;
  const user: MockUser = {
    id: randomId(),
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    phone: typeof body.phone === 'string' ? body.phone : null,
    date_of_birth: age === null ? null : `${new Date().getFullYear() - age}-01-01`,
    gender: isAllowedValue(GENDERS, body.gender) ? body.gender : null,
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
    body: styleAOk({ user: { ...serializeMockUser(user), onboarding_complete: true }, tokens }),
  };
});

/** Mock `POST /users/login/` — API_REFERENCE.md §3, Style A envelope. */
registerMock('POST', '/users/login/', (request) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const email = asString(body.email).trim().toLowerCase();
  const password = asString(body.password);
  const user = mockDb.users.find((candidate) => candidate.email === email);

  if (!user || user.password !== password) {
    return {
      status: 401,
      body: styleAError('INVALID_CREDENTIALS', 'Invalid email or password'),
    };
  }

  const tokens = issueTokenPair({ id: user.id, email: user.email });

  return {
    status: 200,
    delayMs: 350,
    body: styleAOk({ user: serializeMockUser(user), tokens }),
  };
});

/** Mock `POST /users/token/refresh/` — returns a new access token only, per API_REFERENCE.md §3. */
registerMock('POST', '/users/token/refresh/', (request) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const refresh = asString(body.refresh);
  const payload = verifyMockToken(refresh, 'refresh');

  if (!payload) {
    return {
      status: 400,
      body: styleAError('TOKEN_REFRESH_ERROR', 'Invalid refresh token'),
    };
  }

  const user = mockDb.users.find((candidate) => candidate.id === payload.user_id);
  if (!user) {
    return {
      status: 400,
      body: styleAError('TOKEN_REFRESH_ERROR', 'Invalid refresh token'),
    };
  }

  const tokens = issueTokenPair({ id: user.id, email: user.email });

  return {
    status: 200,
    body: styleAOk({ access: tokens.access }),
  };
});

/** Mock `POST /users/logout/` — blacklist the presented access token, matching the real API. */
registerMock('POST', '/users/logout/', (request) => {
  const header = request.headers.Authorization ?? request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token || !verifyMockToken(token, 'access')) {
    return {
      status: 401,
      body: styleAError('UNAUTHORIZED', 'Authentication credentials were not provided.'),
    };
  }

  blacklistMockToken(token);

  return {
    status: 200,
    body: styleAOk(undefined, 'Logged out successfully.'),
  };
});
