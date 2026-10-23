/**
 * Issue #47 — the mock handlers follow the real backend
 * (`apps/users/services/check_in_notices.py`, API_REFERENCE §5): device token register, move and
 * delete; answers are `good` or `rough` on an evening check-in only.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { seedMockCheckInNotice } from '@/features/notifications/mocks/checkInNotices.handlers';

function seedUser(id: string): { user: MockUser; token: string } {
  const user: MockUser = {
    id,
    email: `${id}@example.com`,
    password: 'unused',
    first_name: 'Maya',
    last_name: 'Chen',
    phone: null,
    date_of_birth: null,
    gender: null,
    timezone: 'UTC',
    is_premium: false,
    email_verified: true,
    phone_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  mockDb.users.push(user);
  return { user, token: issueTokenPair(user).access };
}

async function call(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  token: string | undefined,
  body?: unknown,
) {
  const match = resolveMock(method, path);
  if (!match) throw new Error(`${method} ${path} is not registered`);
  return match.handler({
    method,
    path,
    params: match.params,
    query: {},
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
}

describe('mock: device tokens', () => {
  beforeEach(() => __resetMockDbForTests());

  it('requires a signed-in user', async () => {
    const response = await call('POST', '/users/me/device-tokens/', undefined, {
      token: 'ExponentPushToken[a]',
      platform: 'ios',
    });
    expect(response.status).toBe(401);
  });

  it('registers (201), then refreshes the same token (200) without a second row', async () => {
    const { token } = seedUser('u1');
    const body = { token: ' ExponentPushToken[a] ', platform: 'ios' };
    const created = await call('POST', '/users/me/device-tokens/', token, body);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ platform: 'ios', token: 'ExponentPushToken[a]' });
    const again = await call('POST', '/users/me/device-tokens/', token, {
      ...body,
      platform: 'android',
    });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ platform: 'android' });
    expect(mockDb.deviceTokens).toHaveLength(1);
  });

  it('refuses a missing or oversized token and an unknown platform', async () => {
    const { token } = seedUser('u1');
    const post = (body: unknown) => call('POST', '/users/me/device-tokens/', token, body);
    expect(await post({ platform: 'ios' })).toEqual({
      status: 400,
      body: { error: 'token_required' },
    });
    expect(await post({ token: '   ', platform: 'ios' })).toMatchObject({ status: 400 });
    expect(await post({ token: 'x'.repeat(513), platform: 'ios' })).toEqual({
      status: 400,
      body: { error: 'token_too_long' },
    });
    expect(await post({ token: 'abc', platform: 'windows' })).toEqual({
      status: 400,
      body: { error: 'platform_invalid' },
    });
    expect(mockDb.deviceTokens).toHaveLength(0);
  });

  it('moves a token held by another account, deleting that account row and notices', async () => {
    const first = seedUser('u1');
    const second = seedUser('u2');
    const body = { token: 'ExponentPushToken[shared]', platform: 'ios' };
    const row = (await call('POST', '/users/me/device-tokens/', first.token, body)).body as {
      id: string;
    };
    seedMockCheckInNotice('u1', row.id);
    const moved = await call('POST', '/users/me/device-tokens/', second.token, body);
    expect(moved.status).toBe(201);
    expect(mockDb.deviceTokens).toHaveLength(1);
    expect(mockDb.deviceTokens[0].userId).toBe('u2');
    expect(mockDb.checkInNotices).toHaveLength(0);
  });

  it('lists only the caller tokens and deletes only the caller row (204, then 404)', async () => {
    const first = seedUser('u1');
    const second = seedUser('u2');
    const mine = (
      await call('POST', '/users/me/device-tokens/', first.token, {
        token: 'ExponentPushToken[a]',
        platform: 'ios',
      })
    ).body as { id: string };
    await call('POST', '/users/me/device-tokens/', second.token, {
      token: 'ExponentPushToken[b]',
      platform: 'android',
    });
    const list = await call('GET', '/users/me/device-tokens/', first.token);
    expect((list.body as { device_tokens: unknown[] }).device_tokens).toHaveLength(1);
    expect(await call('DELETE', `/users/me/device-tokens/${mine.id}/`, second.token)).toEqual({
      status: 404,
      body: { error: 'token_not_found' },
    });
    expect(await call('DELETE', `/users/me/device-tokens/${mine.id}/`, first.token)).toEqual({
      status: 204,
    });
    expect(await call('DELETE', `/users/me/device-tokens/${mine.id}/`, first.token)).toMatchObject({
      status: 404,
    });
  });
});

describe('mock: answering a check-in notice', () => {
  beforeEach(() => __resetMockDbForTests());

  function answer(token: string | undefined, id: string, body: unknown) {
    return call('POST', `/users/me/check-in-notices/${id}/answer/`, token, body);
  }

  it('records good or rough, and answering again overwrites', async () => {
    const { token } = seedUser('u1');
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const good = await answer(token, notice.id, { action: 'good' });
    expect(good.status).toBe(200);
    expect(good.body).toMatchObject({ id: notice.id, answer: 'good' });
    expect((good.body as { answered_at: string | null }).answered_at).not.toBeNull();
    const rough = await answer(token, notice.id, { action: 'rough' });
    expect(rough.body).toMatchObject({ answer: 'rough' });
  });

  it('does not accept open, other values, a missing action or a non-object body (400)', async () => {
    const { token } = seedUser('u1');
    const notice = seedMockCheckInNotice('u1', 'device-1');
    for (const body of [{ action: 'open' }, { action: 'fine' }, {}, 'good', null, ['good']]) {
      expect(await answer(token, notice.id, body)).toEqual({
        status: 400,
        body: { error: 'action_invalid' },
      });
    }
    expect(notice.answer).toBeNull();
  });

  it('does not accept an answer on a late-night guard notice (400)', async () => {
    const { token } = seedUser('u1');
    const notice = seedMockCheckInNotice('u1', 'device-1', 'late_night_guard');
    expect(await answer(token, notice.id, { action: 'good' })).toMatchObject({ status: 400 });
  });

  it('is 404 for an unknown notice or another account notice, 401 when signed out', async () => {
    const first = seedUser('u1');
    const second = seedUser('u2');
    const notice = seedMockCheckInNotice('u1', 'device-1');
    expect(await answer(first.token, 'no-such-id', { action: 'good' })).toEqual({
      status: 404,
      body: { error: 'notice_not_found' },
    });
    expect(await answer(second.token, notice.id, { action: 'good' })).toMatchObject({
      status: 404,
    });
    expect(await answer(undefined, notice.id, { action: 'good' })).toMatchObject({ status: 401 });
  });
});
