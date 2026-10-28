/**
 * Issue #132 — `POST .../replace/confirm/` and the subsequent `GET /meal-plans/{date}/` must carry
 * `original_meal` (name + macros of the meal that was replaced) and `replacement_reason` on the new
 * meal, exactly as the real backend does (`apps/meals/views.py:809-823` `_replacement_receipt`,
 * merged into every serialized meal via `_serialize_meal` at `apps/meals/views.py:836-868`, and into
 * the confirm response itself at `apps/meals/views.py:518-523`). This is what lets the meal-detail
 * screen show "Replaced <name> — swapped for a closer macro match." and "View the original" on any
 * later visit (restart, deep link, from the plan list) instead of only right after the swap — see
 * `meal-detail-replace-flow.test.tsx`'s "35b replaced receipt" block for the UI side.
 *
 * `_replacement_receipt` returns `{}` (no keys at all, not `null` values) when a meal never
 * replaced anything (`apps/meals/views.py:812-813`), so a never-replaced meal must have neither key
 * present.
 */
import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MealMacroSnapshot, MealPlanDetail } from '@/shared/types/mealPlan';

const DATE = '2026-10-14';

function seedUser(): MockUser {
  const user: MockUser = {
    id: 'original-meal-user',
    email: 'original-meal@example.com',
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

async function replaceLunch(access: string) {
  const plan = mockDb.mealPlans[`original-meal-user:${DATE}`];
  const lunch = plan.meals.find((meal) => meal.meal_type === 'lunch')!;

  const preview = await callRoute(
    'POST',
    `/meal-plans/${DATE}/meals/${lunch.id}/replace/preview/`,
    access,
    { preference: '' },
  );
  const previewBody = preview.body as { preview_token: string };
  const confirm = await callRoute(
    'POST',
    `/meal-plans/${DATE}/meals/${lunch.id}/replace/confirm/`,
    access,
    { preview_token: previewBody.preview_token, chosen_index: 0 },
  );
  return { lunch, confirm };
}

describe('nutrition mock contract: replace/confirm original_meal (issue #132)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('the replace/confirm response carries original_meal and a non-null replacement_reason', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });

    const { lunch, confirm } = await replaceLunch(access);
    const body = confirm.body as {
      original_meal?: MealMacroSnapshot;
      replacement_reason?: string | null;
    };

    expect(body.original_meal).toEqual({
      name: lunch.name,
      calories_kcal: lunch.calories_kcal,
      protein_g: lunch.protein_g,
      carbs_g: lunch.carbs_g,
      fat_g: lunch.fat_g,
    });
    expect(body.replacement_reason).toEqual(expect.any(String));
    expect(body.replacement_reason).not.toBe('');
  });

  it('the replacement meal keeps original_meal/replacement_reason after a later GET (the "restart" case)', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });

    const { lunch, confirm } = await replaceLunch(access);
    const newMealId = (confirm.body as { meal_id: number }).meal_id;

    const getResponse = await callRoute('GET', `/meal-plans/${DATE}/`, access);
    const plan = getResponse.body as MealPlanDetail;
    const replacement = plan.meals.find(
      (meal) => meal.id === newMealId,
    ) as MealPlanDetail['meals'][number] & {
      original_meal?: { name: string };
      replacement_reason?: string | null;
    };

    expect(replacement.original_meal?.name).toBe(lunch.name);
    expect(replacement.replacement_reason).not.toBe('');
    expect(replacement.replacement_reason).not.toBeUndefined();
  });

  it('a meal that never replaced anything has neither key present', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });

    const getResponse = await callRoute('GET', `/meal-plans/${DATE}/`, access);
    const plan = getResponse.body as MealPlanDetail;

    for (const meal of plan.meals) {
      expect('original_meal' in meal).toBe(false);
      expect('replacement_reason' in meal).toBe(false);
    }
  });
});
