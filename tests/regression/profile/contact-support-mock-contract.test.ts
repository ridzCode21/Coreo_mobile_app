/**
 * Issue #179 — mock for `POST /core/contact-support/`, matching the real backend code exactly:
 * `apps/core/urls.py:14`, `apps/core/views.py:121-151` (`contact_support`), and
 * `apps/core/serializers.py:21-31` (`ContactSupportSerializer`: `subject` max_length=200 required,
 * `message` required, `category` one of bug/feature/support/other, `attach_logs` boolean default
 * false). The endpoint has no `@permission_classes` override, so it uses the project default
 * `IsAuthenticated` (med_app/settings.py:139-141). The frontend always sends
 * `category: 'support'`, `attach_logs: false` (issue text: "category fixed to support"). Calls the
 * handler directly, same pattern as `change-password-mock-contract.test.ts`.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'support-user-1',
    email: 'jordan@example.com',
    password: 'correct-horse-battery',
    first_name: 'Jordan',
    last_name: 'Lee',
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

describe('profile mocks: POST /core/contact-support/ (issue #179, views.py:121-151)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns 401 with no token', async () => {
    const response = await call('/core/contact-support/', {
      subject: 'Help',
      message: 'Need help',
      category: 'support',
      attach_logs: false,
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 with a subject error when subject is blank (serializers.py:22)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/core/contact-support/',
      { subject: '', message: 'Need help', category: 'support', attach_logs: false },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as {
      success: false;
      error: { code: string; details: Record<string, string[]> };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.subject).toBeDefined();
  });

  it('returns 400 with a message error when message is blank (serializers.py:23)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/core/contact-support/',
      { subject: 'Help', message: '', category: 'support', attach_logs: false },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as { error: { details: Record<string, string[]> } };
    expect(body.error.details.message).toBeDefined();
  });

  it('returns 400 when category is not one of the four allowed choices (serializers.py:24-30)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/core/contact-support/',
      { subject: 'Help', message: 'Need help', category: 'billing', attach_logs: false },
      access,
    );

    expect(response.status).toBe(400);
    const body = response.body as { error: { details: Record<string, string[]> } };
    expect(body.error.details.category).toBeDefined();
  });

  it('on success, returns 200 with the support_request envelope and records the request', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await call(
      '/core/contact-support/',
      {
        subject: 'Photo logging crashes',
        message: 'The camera button closes the app.',
        category: 'support',
        attach_logs: false,
      },
      access,
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      success: true;
      message: string;
      data: {
        support_request: { id: string; subject: string; category: string; submitted_at: string };
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.support_request.subject).toBe('Photo logging crashes');
    expect(body.data.support_request.category).toBe('support');
    expect(typeof body.data.support_request.id).toBe('string');
    expect(typeof body.data.support_request.submitted_at).toBe('string');

    expect(mockDb.supportRequests).toHaveLength(1);
    expect(mockDb.supportRequests[0]).toMatchObject({
      userId: user.id,
      subject: 'Photo logging crashes',
      message: 'The camera button closes the app.',
      category: 'support',
      attachLogs: false,
    });
  });
});
