import '@/shared/api/mock/registerAllMocks';
import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'notebook-user',
    email: 'notebook@example.com',
    password: 'unused',
    first_name: 'Notebook',
    last_name: 'User',
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

async function call(
  method: 'GET' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
) {
  const match = resolveMock(method, path);
  if (!match) throw new Error(`${method} ${path} is not registered`);
  return match.handler({
    method,
    path,
    params: match.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
}

describe('profile notebook mock contract', () => {
  beforeEach(() => __resetMockDbForTests());

  it('returns the authenticated caller’s bare, server-owned notebook payload', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const match = resolveMock('GET', '/users/me/memory-facts/');
    const response = await match!.handler({
      method: 'GET',
      path: '/users/me/memory-facts/',
      params: {},
      query: {},
      headers: { Authorization: `Bearer ${access}` },
    } as MockRequest);

    expect(response).toMatchObject({
      status: 200,
      body: {
        eyebrow: "Coreo's notebook",
        title: 'What I know about you.',
        subtitle: 'Correct me anytime.',
        facts: [],
      },
    });
  });

  it('matches text-only PATCH validation, trimming, and caller isolation', async () => {
    const user = seedUser();
    const other = seedUser({ id: 'another-notebook-user', email: 'another@example.com' });
    const { access } = issueTokenPair(user);
    const { access: otherAccess } = issueTokenPair(other);
    mockDb.memoryFacts.push({
      id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
      userId: user.id,
      text: 'Before',
      source_label: 'From your interview · March',
      stored_at: '2026-03-01T00:00:00+00:00',
      badge: 'New',
    });

    await expect(
      call('PATCH', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', access, {}),
    ).resolves.toEqual({ status: 400, body: { error: 'text_required' } });
    await expect(
      call('PATCH', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', access, {
        text: 'x',
        extra: true,
      }),
    ).resolves.toEqual({ status: 400, body: { error: 'text_only' } });
    await expect(
      call('PATCH', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', access, {
        text: 'x'.repeat(501),
      }),
    ).resolves.toEqual({ status: 400, body: { error: 'text_too_long' } });
    await expect(
      call('PATCH', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', otherAccess, {
        text: 'After',
      }),
    ).resolves.toEqual({ status: 404, body: { error: 'fact_not_found' } });
    await expect(
      call('PATCH', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', access, {
        text: ' After ',
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: { text: 'After', source_label: 'From your interview · March', badge: 'New' },
    });
  });

  it('returns 204 for single and collection deletes without removing another caller’s facts', async () => {
    const user = seedUser();
    const other = seedUser({ id: 'another-notebook-user', email: 'another@example.com' });
    const { access } = issueTokenPair(user);
    mockDb.memoryFacts.push(
      {
        id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
        userId: user.id,
        text: 'Mine',
        source_label: 'Source',
        stored_at: '2026-03-01T00:00:00+00:00',
        badge: null,
      },
      {
        id: 'e95e2bd4-6258-4a8e-a796-b49670014f1a',
        userId: other.id,
        text: 'Theirs',
        source_label: 'Source',
        stored_at: '2026-03-01T00:00:00+00:00',
        badge: null,
      },
    );

    await expect(
      call('DELETE', '/users/me/memory-facts/18e639d8-2454-4a94-8fd1-6c062729bf35/', access),
    ).resolves.toEqual({ status: 204 });
    await expect(call('DELETE', '/users/me/memory-facts/', access)).resolves.toEqual({
      status: 204,
    });
    expect(mockDb.memoryFacts).toEqual([
      expect.objectContaining({ userId: other.id, text: 'Theirs' }),
    ]);
  });
});
