/**
 * Issue #23 — the "Nutrition label" tile must call `POST /food/label-ocr/`, not `/food/photo/`
 * (`API_REFERENCE.md:1155-1172`). This file protects the mock side of that contract directly
 * against the mock router, independent of any UI: a label-ocr handler must exist, enforce its own
 * daily quota separately from the photo quota (backend `apps/food_tracking/views.py:283-312` keys
 * the two limits as `photo_ratelimit:*` and `label_ocr_ratelimit:*`), and `POST /food/entries/`
 * must persist whatever `source` it's sent (so `source: 'label_ocr'` round-trips) per
 * `API_REFERENCE.md:959-960`.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

function seedUser(id: string): MockUser {
  const user: MockUser = {
    id,
    email: `${id}@example.com`,
    password: 'unused',
    first_name: 'Test',
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
  };
  mockDb.users.push(user);
  return user;
}

function request(
  overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>,
): MockRequest {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callLabelOcr(token: string) {
  const match = resolveMock('POST', '/food/label-ocr/');
  if (!match) throw new Error('POST /food/label-ocr/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/food/label-ocr/',
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

async function callPhoto(token: string) {
  const match = resolveMock('POST', '/food/photo/');
  if (!match) throw new Error('POST /food/photo/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/food/photo/',
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

describe('nutrition mock: POST /food/label-ocr/ (issue #23)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('is registered as its own route (not reusing the photo handler)', () => {
    expect(resolveMock('POST', '/food/label-ocr/')).toBeDefined();
  });

  it('returns a label estimate shaped like API_REFERENCE.md:1159-1165', async () => {
    const user = seedUser('label-user-1');
    const { access } = issueTokenPair(user);

    const response = await callLabelOcr(access);

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(typeof body.name).toBe('string');
    expect(typeof body.portion_grams).toBe('number');
    expect(typeof body.est_calories).toBe('number');
    expect(typeof body.est_protein_g).toBe('number');
    expect(typeof body.est_carbs_g).toBe('number');
    expect(typeof body.est_fat_g).toBe('number');
    // Issue #26 needs servings_per_container to drive the 21c/21d servings control — it must be a
    // positive number (a container always has at least one serving).
    expect(typeof body.servings_per_container).toBe('number');
    expect(body.servings_per_container as number).toBeGreaterThan(0);
    // Issue #137 — apps/core/services/inference.py:151 adds serving_size_text (the printed
    // serving phrase) to the real response; the mock must follow suit.
    expect(typeof body.serving_size_text).toBe('string');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await callLabelOcr('not-a-real-token');
    expect(response.status).toBe(401);
  });

  it('enforces a 10/day limit and returns the label-specific 429 copy (views.py:298-302)', async () => {
    const user = seedUser('label-user-2');
    const { access } = issueTokenPair(user);

    for (let i = 0; i < 10; i += 1) {
      const ok = await callLabelOcr(access);
      expect(ok.status).toBe(200);
    }

    const limited = await callLabelOcr(access);
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Daily label scan limit reached. Enter meal manually.' });
  });

  it('keeps the label-scan quota independent of the photo quota (views.py:259 vs :294)', async () => {
    const user = seedUser('label-user-3');
    const { access } = issueTokenPair(user);

    for (let i = 0; i < 10; i += 1) {
      expect((await callPhoto(access)).status).toBe(200);
    }
    // Photo quota is now exhausted; label-ocr must still succeed.
    expect((await callLabelOcr(access)).status).toBe(200);
    expect((await callPhoto(access)).status).toBe(429);

    for (let i = 0; i < 9; i += 1) {
      expect((await callLabelOcr(access)).status).toBe(200);
    }
    // Label quota is now exhausted (10 used total); photo must be unaffected... but it's already
    // exhausted above, so assert the label-specific 429 copy instead to prove it's a separate key.
    const labelLimited = await callLabelOcr(access);
    expect(labelLimited.status).toBe(429);
    expect(labelLimited.body).toEqual({
      error: 'Daily label scan limit reached. Enter meal manually.',
    });
  });
});
describe('nutrition mock: POST /food/entries/ accepts source "label_ocr" (API_REFERENCE.md:959-960)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('persists and returns source: "label_ocr" on the created entry', async () => {
    const user = seedUser('entry-user-1');
    const { access } = issueTokenPair(user);
    const match = resolveMock('POST', '/food/entries/');
    if (!match) throw new Error('POST /food/entries/ is not registered');

    const response = await match.handler(
      request({
        method: 'POST',
        path: '/food/entries/',
        headers: { Authorization: `Bearer ${access}` },
        body: {
          date: '2026-10-13',
          meal_type: 'snack',
          food_name: 'Protein bar',
          calories: 210,
          protein_g: 20,
          carbs_g: 22,
          fat_g: 6,
          source: 'label_ocr',
        },
      }),
    );

    expect(response.status).toBe(201);
    expect((response.body as Record<string, unknown>).source).toBe('label_ocr');
  });
});
