/**
 * Issue #35 — the mock transport for the replace endpoints must match the real backend contract
 * (`apps/meals/views.py:410-461` preview, `:464-497` confirm;
 * `apps/meals/services/grounding.py:114-150` for exactly which fields an alternative carries;
 * `apps/meals/views.py:133-172` for the GET list excluding replaced meals). Before this issue,
 * `ReplacePreviewAlternative` (and the mock's `alternativeFromMeal`) invented fields the real
 * endpoint never returns (`recipe_json`, `base_*`, `portion_multiplier`, `confidence_note`,
 * `ingredients_json`, `constraint_violation`) while omitting ones it does
 * (`nutrition_source`/`nutrition_trace`/`ingredients`) — see plan.md Decision #12.
 */

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MealPlanDetail, ReplacePreviewAlternative } from '@/shared/types/mealPlan';

const DATE = '2026-10-14';

const REAL_ALTERNATIVE_KEYS = [
  'meal_type',
  'name',
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'rationale',
  'serving_size',
  'prep_time_minutes',
  'estimated_cost_tier',
  'ingredients',
  'nutrition_source',
  'nutrition_trace',
].sort();

const INVENTED_KEYS_THAT_MUST_NOT_APPEAR = [
  'recipe_json',
  'base_calories_kcal',
  'base_protein_g',
  'base_carbs_g',
  'base_fat_g',
  'portion_multiplier',
  'confidence_note',
  'ingredients_json',
  'constraint_violation',
];

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'replace-user',
    email: 'replace@example.com',
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

function callRoute(method: 'GET' | 'POST', path: string, token: string, body?: unknown) {
  const match = resolveMock(method, path);
  if (!match) throw new Error(`${method} ${path} is not registered`);
  const request: MockRequest = {
    method,
    path,
    params: match.params,
    query: {},
    headers: { Authorization: `Bearer ${token}` },
    body,
  };
  return match.handler(request);
}

async function createPlanAndGetDinner(token: string, userId: string) {
  await callRoute('POST', '/meal-plans/', token, { date: DATE });
  const plan = mockDb.mealPlans[`${userId}:${DATE}`];
  const dinner = plan.meals.find((meal) => meal.meal_type === 'dinner')!;
  return dinner;
}

describe('nutrition mock contract: replace preview/confirm (issue #35)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('preview response alternatives match the real backend’s field set exactly', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const dinner = await createPlanAndGetDinner(access, user.id);

    const response = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/preview/`,
      access,
      { preference: '' },
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      alternatives: ReplacePreviewAlternative[];
      preview_token: string;
    };
    expect(body.alternatives.length).toBeGreaterThan(0);
    for (const alternative of body.alternatives) {
      expect(Object.keys(alternative).sort()).toEqual(REAL_ALTERNATIVE_KEYS);
      for (const invented of INVENTED_KEYS_THAT_MUST_NOT_APPEAR) {
        expect(alternative).not.toHaveProperty(invented);
      }
      expect(alternative.rationale.startsWith('Approx. ')).toBe(true);
      expect(alternative.nutrition_source).toBe('food_records');
    }
    expect(typeof body.preview_token).toBe('string');
  });

  it('confirm returns exactly {status: "ok", meal_id} like meal_operations.py:283', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const dinner = await createPlanAndGetDinner(access, user.id);

    const preview = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/preview/`,
      access,
      { preference: '' },
    );
    const previewBody = preview.body as { preview_token: string };

    const confirm = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/confirm/`,
      access,
      { preview_token: previewBody.preview_token, chosen_index: 0 },
    );

    expect(confirm.status).toBe(200);
    expect(Object.keys(confirm.body as object).sort()).toEqual(['meal_id', 'status']);
    expect((confirm.body as { status: string }).status).toBe('ok');
    expect(typeof (confirm.body as { meal_id: number }).meal_id).toBe('number');
  });

  it('after confirm, GET excludes the old meal and includes the new one with replacement_of_id set', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const dinner = await createPlanAndGetDinner(access, user.id);

    const preview = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/preview/`,
      access,
      { preference: '' },
    );
    const previewBody = preview.body as { preview_token: string };
    const confirm = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/confirm/`,
      access,
      { preview_token: previewBody.preview_token, chosen_index: 0 },
    );
    const newMealId = (confirm.body as { meal_id: number }).meal_id;

    const getResponse = await callRoute('GET', `/meal-plans/${DATE}/`, access);
    const plan = getResponse.body as MealPlanDetail;

    expect(plan.meals.some((meal) => meal.id === dinner.id)).toBe(false);
    const replacement = plan.meals.find((meal) => meal.id === newMealId);
    expect(replacement).toBeTruthy();
    expect(replacement?.replacement_of_id).toBe(dinner.id);
  });

  it('confirm with an unknown or expired token returns 404 preview_not_found', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    const dinner = await createPlanAndGetDinner(access, user.id);

    const response = await callRoute(
      'POST',
      `/meal-plans/${DATE}/meals/${dinner.id}/replace/confirm/`,
      access,
      { preview_token: 'not-a-real-token', chosen_index: 0 },
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual(expect.objectContaining({ error: 'preview_not_found' }));
  });
});
