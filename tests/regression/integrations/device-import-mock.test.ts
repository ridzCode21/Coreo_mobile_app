/**
 * Issue #55 — the mock of `POST /insights/import/` follows the backend's rules
 * (apps/integrations/serializers.py, device_sync.py), so the app behaves the same in mock and live mode.
 */
import '@/shared/api/mock/registerAllMocks';
import { __resetMockDeviceSyncForTests } from '@/features/integrations/mocks/deviceImport.handlers';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'import-user-1',
    email: 'asha@example.com',
    password: 'unused',
    first_name: 'Asha',
    last_name: 'Rao',
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
  return user;
}

async function post(body: unknown, token?: string) {
  const match = resolveMock('POST', '/insights/import/');
  if (!match) throw new Error('POST /insights/import/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/insights/import/',
    params: {},
    query: {},
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  };
  return match.handler(request);
}

const row = (date: string, extra: Record<string, unknown> = {}) => ({
  date,
  steps: 8400,
  workout_sessions: [],
  ...extra,
});

describe('mock POST /insights/import/', () => {
  let token: string;

  beforeEach(() => {
    __resetMockDbForTests();
    __resetMockDeviceSyncForTests();
    token = issueTokenPair(seedUser()).access;
  });

  it('needs a signed-in user', async () => {
    expect((await post({ source: 'health_connect', daily_logs: [] })).status).toBe(401);
  });

  it('accepts a batch and answers with the backend shape', async () => {
    const response = await post(
      { source: 'health_connect', daily_logs: [row('2026-06-08'), row('2026-06-09')] },
      token,
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      source: 'health_connect',
      days_written: 2,
      synced_through: '2026-06-09',
    });
  });

  it('an empty batch is a sync with no watermark yet', async () => {
    const response = await post({ source: 'apple_health', daily_logs: [] }, token);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ days_written: 0, synced_through: null });
  });

  it('the watermark only moves forward', async () => {
    await post({ source: 'health_connect', daily_logs: [row('2026-06-10')] }, token);
    const response = await post(
      { source: 'health_connect', daily_logs: [row('2026-06-05')] },
      token,
    );
    expect(response.body).toMatchObject({ synced_through: '2026-06-10' });
  });

  it('keeps a separate watermark per source', async () => {
    await post({ source: 'health_connect', daily_logs: [row('2026-06-10')] }, token);
    const response = await post({ source: 'apple_health', daily_logs: [row('2026-06-02')] }, token);
    expect(response.body).toMatchObject({ synced_through: '2026-06-02' });
  });

  it.each([
    ['an unknown source', { source: 'whoop', daily_logs: [] }, 'source'],
    [
      'a duplicate date',
      { source: 'health_connect', daily_logs: [row('2026-06-08'), row('2026-06-08')] },
      'daily_logs',
    ],
    ['a bad date', { source: 'health_connect', daily_logs: [row('June 8')] }, 'daily_logs'],
    [
      'negative steps',
      { source: 'health_connect', daily_logs: [row('2026-06-08', { steps: -1 })] },
      'daily_logs',
    ],
    [
      '25 hours of sleep',
      { source: 'health_connect', daily_logs: [row('2026-06-08', { sleep_hours: 25 })] },
      'daily_logs',
    ],
    [
      'a date after tomorrow',
      { source: 'health_connect', daily_logs: [row('2999-01-01')] },
      'daily_logs',
    ],
  ])('rejects %s with VALIDATION_ERROR', async (_label, body, field) => {
    const response = await post(body, token);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
    });
    expect((response.body as { error: { details: object } }).error.details).toHaveProperty(field);
  });

  it('rejects more than 366 days in one batch', async () => {
    const many = Array.from({ length: 367 }, (_, index) =>
      row(new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10)),
    );
    const response = await post({ source: 'health_connect', daily_logs: many }, token);
    expect(response.status).toBe(400);
  });
});
