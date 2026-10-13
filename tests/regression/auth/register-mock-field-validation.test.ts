/**
 * Issue #8 — optional registration fields still use the backend serializer's validators when
 * supplied: age is 1–120, weight is non-negative, and gender is one of User.Gender. An invalid
 * `active_pillars` value fails at that field boundary before Diet-dependent validation runs.
 */

import '@/shared/api/mock/registerAllMocks';
import { __resetMockDbForTests } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';

type RegisterEnvelope = {
  error?: { details?: Record<string, string[]> };
};

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'maya@example.com',
    password: 'quiet-harbor-42',
    password_confirm: 'quiet-harbor-42',
    first_name: 'Maya',
    goal: 'get_stronger',
    active_pillars: ['fitness'],
    ...overrides,
  };
}

async function validationDetails(body: unknown): Promise<Record<string, string[]>> {
  const match = resolveMock('POST', '/users/register/');
  if (!match) throw new Error('POST /users/register/ is not registered');
  const request: MockRequest = {
    method: 'POST',
    path: '/users/register/',
    params: match.params,
    query: {},
    headers: {},
    body,
  };
  const response = (await match.handler(request)) as MockResponse & { body: RegisterEnvelope };
  expect(response.status).toBe(400);
  return response.body.error?.details ?? {};
}

describe('auth mock: registration field validation (issue #8)', () => {
  beforeEach(() => __resetMockDbForTests());

  it.each([
    ['age', { age: 121 }],
    ['height_cm', { height_cm: 'tall' }],
    ['weight_kg', { weight_kg: -1 }],
    ['gender', { gender: 'unknown' }],
  ])('rejects an invalid optional %s when supplied', async (field, override) => {
    const details = await validationDetails(validBody(override));
    expect(details[field]).toBeDefined();
  });

  it('does not run Diet-dependent checks when active_pillars itself is invalid', async () => {
    const details = await validationDetails(validBody({ active_pillars: ['diet', 'unknown'] }));
    expect(details.active_pillars).toBeDefined();
    expect(details.age).toBeUndefined();
    expect(details.height_cm).toBeUndefined();
    expect(details.weight_kg).toBeUndefined();
    expect(details.gender).toBeUndefined();
  });
});
