/**
 * Mock handlers for the check-in notice routes, following the real backend
 * (`apps/users/services/check_in_notices.py`, API_REFERENCE §5, issue #47): device tokens are
 * registered and removed, a token already held by another account moves to the caller, and an
 * answer is `good` or `rough` on an `evening_check_in` notice only. The mock never "sends" a
 * push; tests and dev tools add a notice with `seedMockCheckInNotice`.
 */
import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockCheckInNotice, type MockDeviceToken } from '@/shared/api/mock/db';
import { registerMock } from '@/shared/api/mock/router';

const TOKEN_MAX = 512;
const PLATFORMS = ['ios', 'android', 'web'] as const;

function unauthorized() {
  return { status: 401, body: { error: 'authentication_required' } };
}

function error(code: string, status: 400 | 404) {
  return { status, body: { error: code } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

function tokenPayload(row: MockDeviceToken) {
  return {
    id: row.id,
    platform: row.platform,
    token: row.token,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function noticePayload(notice: MockCheckInNotice) {
  const { userId: _userId, ...payload } = notice;
  return payload;
}

/** Test and dev helper: the row the server would write after sending a nudge to a device. */
export function seedMockCheckInNotice(
  userId: string,
  deviceTokenId: string,
  kind: MockCheckInNotice['kind'] = 'evening_check_in',
): MockCheckInNotice {
  const evening = kind === 'evening_check_in';
  const notice: MockCheckInNotice = {
    id: mockUuid(),
    userId,
    kind,
    title: evening ? 'Evening check-in' : 'Late-night guard',
    body: evening
      ? 'Twenty seconds. How did today feel?'
      : "It's 10. Hungry, or just awake? Tell me.",
    time: evening ? '9:00 PM' : '10:00 PM',
    actions: evening
      ? [
          { key: 'good', label: 'Good' },
          { key: 'rough', label: 'Rough' },
          { key: 'open', label: 'Open' },
        ]
      : [{ key: 'open', label: 'Open' }],
    due_at: new Date().toISOString(),
    device_token_id: deviceTokenId,
    status: 'sent',
    error: '',
    sent_at: new Date().toISOString(),
    answer: null,
    answered_at: null,
  };
  mockDb.checkInNotices.push(notice);
  return notice;
}

registerMock('POST', '/users/me/device-tokens/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const body = isRecord(request.body) ? request.body : {};
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return error('token_required', 400);
  if (token.length > TOKEN_MAX) return error('token_too_long', 400);
  const platform = PLATFORMS.find((candidate) => candidate === body.platform);
  if (!platform) return error('platform_invalid', 400);

  const now = new Date().toISOString();
  const existing = mockDb.deviceTokens.find((row) => row.token === token);
  if (existing && existing.userId === user.id) {
    existing.platform = platform;
    existing.updated_at = now;
    return { status: 200, body: tokenPayload(existing) };
  }
  if (existing) {
    // A device receives only the signed-in account's notices: the other account's row goes.
    mockDb.deviceTokens = mockDb.deviceTokens.filter((row) => row.id !== existing.id);
    mockDb.checkInNotices = mockDb.checkInNotices.filter(
      (notice) => notice.device_token_id !== existing.id,
    );
  }
  const row: MockDeviceToken = {
    id: mockUuid(),
    userId: user.id,
    token,
    platform,
    created_at: now,
    updated_at: now,
  };
  mockDb.deviceTokens.push(row);
  return { status: 201, body: tokenPayload(row) };
});

registerMock('GET', '/users/me/device-tokens/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const rows = mockDb.deviceTokens.filter((row) => row.userId === user.id);
  return { status: 200, body: { device_tokens: rows.map(tokenPayload) } };
});

registerMock('DELETE', '/users/me/device-tokens/:tokenId/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const row = mockDb.deviceTokens.find(
    (candidate) => candidate.id === request.params.tokenId && candidate.userId === user.id,
  );
  if (!row) return error('token_not_found', 404);
  mockDb.deviceTokens = mockDb.deviceTokens.filter((candidate) => candidate.id !== row.id);
  mockDb.checkInNotices = mockDb.checkInNotices.filter(
    (notice) => notice.device_token_id !== row.id,
  );
  return { status: 204 };
});

registerMock('GET', '/users/me/check-in-notices/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const notices = mockDb.checkInNotices
    .filter((notice) => notice.userId === user.id)
    .sort((left, right) => right.due_at.localeCompare(left.due_at))
    .map(noticePayload);
  return { status: 200, body: { notices } };
});

registerMock('POST', '/users/me/check-in-notices/:noticeId/answer/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const notice = mockDb.checkInNotices.find(
    (candidate) => candidate.id === request.params.noticeId && candidate.userId === user.id,
  );
  if (!notice) return error('notice_not_found', 404);
  const action = isRecord(request.body) ? request.body.action : undefined;
  if (notice.kind !== 'evening_check_in' || (action !== 'good' && action !== 'rough')) {
    return error('action_invalid', 400);
  }
  // Answering again overwrites, as on the server.
  notice.answer = action;
  notice.answered_at = new Date().toISOString();
  return { status: 200, body: noticePayload(notice) };
});
