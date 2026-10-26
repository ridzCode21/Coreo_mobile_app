/**
 * Issue #32 — the mock meal-plan transport must carry `scheduled_time` the same way the real
 * backend does: a 24-hour, zero-padded `HH:MM` string or `null`.
 * (`apps/meals/models.py:124` `TimeField(null=True, blank=True)`,
 * serialized in `apps/meals/views.py:808` as
 * `meal.scheduled_time.strftime("%H:%M") if meal.scheduled_time else None`, documented in
 * API_REFERENCE.md ~line 1981). Generation never supplies the field
 * (`apps/meals/tasks.py:301-320`), so every newly generated meal has a `null` time. Replacement
 * flows retain an already-stored time rather than dropping it.
 */
import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { resolveMock, type MockRequest } from '@/shared/api/mock/router';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MealPlanDetail } from '@/shared/types/mealPlan';

const DATE = '2026-10-14';
function seedUser(): MockUser {
  const user: MockUser = {
    id: 'scheduled-time-user',
    email: 'scheduled-time@example.com',
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

describe('nutrition mock contract: meal scheduled_time (issue #32)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
  });

  it('every meal in a generated plan has a null scheduled_time', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });

    const getResponse = await callRoute('GET', `/meal-plans/${DATE}/`, access);
    const plan = getResponse.body as MealPlanDetail;

    expect(plan.meals.length).toBeGreaterThan(0);
    for (const meal of plan.meals) {
      expect(meal.scheduled_time).toBeNull();
    }
  });

  it('a replaced meal keeps an existing scheduled_time', async () => {
    const user = seedUser();
    const { access } = issueTokenPair(user);
    await callRoute('POST', '/meal-plans/', access, { date: DATE });
    const plan = mockDb.mealPlans[`${user.id}:${DATE}`];
    const lunch = plan.meals.find((meal) => meal.meal_type === 'lunch')!;
    lunch.scheduled_time = '12:30';

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
    const newMealId = (confirm.body as { meal_id: number }).meal_id;

    const getResponse = await callRoute('GET', `/meal-plans/${DATE}/`, access);
    const updatedPlan = getResponse.body as MealPlanDetail;
    const replacement = updatedPlan.meals.find((meal) => meal.id === newMealId);

    expect(replacement?.scheduled_time).toBe('12:30');
  });
});
