/**
 * Issue #24 — "Check my math shows editable items and teaches the backend." The photo endpoint
 * already returns per-item detail (`apps/food_tracking/views.py:285-288` builds
 * `asdict(FoodEstimate)` with an `items` list of `FoodEstimateItem`,
 * `apps/core/services/inference.py:104-128`), but the frontend's `PhotoEstimate` type, the confirm
 * route's prefill schema, and the mock all drop it on the floor. This protects: the prefill schema
 * can carry `items`, and the mock's `POST /food/photo/` response includes an `items[]` that matches
 * the design's exact per-row copy (design-spec.md lines 9-26) without disturbing the existing
 * aggregate fields other screens already read.
 */

import '@/shared/api/mock/registerAllMocks';

import { __resetMockDbForTests, mockDb, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { confirmPrefillSchema } from '@/features/nutrition/schemas';

const ITEM_SHAPE = {
  name: 'Test item',
  portion_label: '1 cup',
  portion_grams: 100,
  est_calories: 100,
  est_protein_g: 1,
  est_carbs_g: 1,
  est_fat_g: 1,
  confidence: 0.9,
  guessed: false,
  guess_note: null,
  remembered: false,
};

function testUser(): MockUser {
  return {
    id: 'photo-items-user',
    email: 'photo-items@example.com',
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
}

describe('nutrition: confirmPrefillSchema carries photo items[] (issue #24)', () => {
  it('accepts an items array shaped like the backend FoodEstimateItem', () => {
    expect(() =>
      confirmPrefillSchema.parse({
        food_name: 'Rice bowl, paneer, greens',
        calories: 640,
        protein_g: 32,
        carbs_g: 74,
        fat_g: 22,
        items: [ITEM_SHAPE],
      }),
    ).not.toThrow();
  });

  it('still accepts a prefill with no items (manual/barcode/label_ocr paths, no regression)', () => {
    const parsed = confirmPrefillSchema.parse({ food_name: 'Protein bar' });
    expect(parsed.items).toBeUndefined();
  });
});

describe('nutrition mock contract: POST /food/photo/ returns items[] (issue #24)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('returns the design-exact 4 items alongside the unchanged aggregate totals', async () => {
    const user = testUser();
    mockDb.users.push(user);
    const { access } = issueTokenPair(user);
    const route = resolveMock('POST', '/food/photo/');
    if (!route) throw new Error('POST /food/photo/ is not registered');

    const request: MockRequest = {
      method: 'POST',
      path: '/food/photo/',
      params: route.params,
      query: {},
      headers: { Authorization: `Bearer ${access}` },
      body: {},
    };
    const response = await route.handler(request);
    const body = response.body as {
      name: string;
      est_calories: number;
      est_protein_g: number;
      est_carbs_g: number;
      est_fat_g: number;
      items: {
        name: string;
        portion_label: string | null;
        est_calories: number;
        guessed: boolean;
        guess_note: string | null;
        remembered: boolean;
      }[];
    };

    expect(response.status).toBe(200);
    // Aggregate totals (design-spec.md line 6 header card) unchanged from today's mock.
    expect(body.name).toBe('Rice bowl with paneer and greens');
    expect(body.est_calories).toBe(640);
    expect(body.est_protein_g).toBe(32);
    expect(body.est_carbs_g).toBe(74);
    expect(body.est_fat_g).toBe(22);

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(4);

    const byName = Object.fromEntries(body.items.map((item) => [item.name, item]));
    expect(byName['Steamed rice']).toMatchObject({
      portion_label: '1 cup',
      est_calories: 205,
      guessed: false,
      remembered: false,
    });
    expect(byName['Paneer, pan-fried']).toMatchObject({
      portion_label: '80g',
      est_calories: 235,
      guessed: false,
      remembered: false,
    });
    expect(byName['Ghee']).toMatchObject({
      portion_label: '1 tbsp',
      est_calories: 135,
      remembered: true,
    });
    expect(byName['Sautéed greens']).toMatchObject({
      portion_label: '1 cup',
      est_calories: 80,
      guessed: false,
      remembered: false,
    });

    // Only the remembered item is remembered — the other 3 carry neither badge (design-spec.md:
    // only the Ghee row's markup shows "From your fix last time" + "Fix").
    const rememberedCount = body.items.filter((item) => item.remembered).length;
    expect(rememberedCount).toBe(1);
  });
});
