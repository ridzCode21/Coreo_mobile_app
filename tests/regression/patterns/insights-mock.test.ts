/**
 * Issue #50 — mock-layer contract parity with `GET /insights/`
 * (`apps/insights/views.py:92-122`). Pattern mirrors `wellness/right-now-mock.test.ts`.
 *
 * Unlike the real backend, the mock has no `DailyLog` count to derive `days_logged` from (no
 * existing mock tracks daily-log state at all — plan.md Decision log #11), so the handler simply
 * returns whatever `setMockInsightsResponse()` last set, defaulting to an honest "brand new mock
 * user" `not_enough_data` shape rather than fabricating a `ready` state by default.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { setMockInsightsResponse } from '@/features/patterns/mocks/insights.handlers';

const URL = '/insights/';

function seedUser(overrides: Partial<MockUser> = {}): MockUser {
  const user: MockUser = {
    id: 'patterns-user-1',
    email: 'patterns@example.com',
    password: 'unused',
    first_name: 'Pat',
    last_name: 'Terns',
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
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callGet(token?: string) {
  const match = resolveMock('GET', URL);
  if (!match) throw new Error(`GET ${URL} is not registered`);
  return match.handler(
    request({
      method: 'GET',
      path: URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
}

describe('patterns: mock GET /insights/ (#50)', () => {
  beforeEach(() => {
    mockDb.users.length = 0;
    setMockInsightsResponse(null);
  });

  it('requires authentication', async () => {
    const response = await callGet();
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('defaults to an honest not_enough_data shape for a fresh mock user', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'not_enough_data',
      days_logged: 0,
      days_remaining: 30,
    });
  });

  it('returns whatever setMockInsightsResponse() last set (not_enough_data)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    setMockInsightsResponse({ status: 'not_enough_data', days_logged: 22, days_remaining: 8 });

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'not_enough_data',
      days_logged: 22,
      days_remaining: 8,
    });
  });

  it('returns a configured no_insights response matching the real backend message', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    setMockInsightsResponse({ status: 'no_insights', message: 'Keep logging...' });

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'no_insights', message: 'Keep logging...' });
  });

  it('returns a configured ready response with insight cards matching the serializer shape', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const card = {
      id: 1,
      col_x: 'sleep_hours',
      col_y: 'steps',
      r_value: -0.35,
      lag_days: 1,
      insight_text: 'Less sleep seems linked to fewer steps the next day.',
      autocorrelation_warning: false,
      created_at: '2026-06-01T00:00:00Z',
      disclaimer:
        'Health patterns only. Not medical advice. Consult a healthcare provider for medical decisions.',
    };
    setMockInsightsResponse({ status: 'ready', insights: [card] });

    const response = await callGet(access);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready', insights: [card] });
  });
});
