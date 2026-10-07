import { requireMockUser } from '@/shared/api/mock/auth';
import { advanceOnPoll } from '@/shared/api/mock/asyncJob';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import { registerMock, type MockRequest, type MockResponse } from '@/shared/api/mock/router';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { MealType, FoodEntry } from '@/shared/types/food';
import type {
  AssistantPromptOption,
  FeedbackType,
  MealPlanCreateResponse,
  MealPlanDetail,
  MealPlanStatus,
  PlannedMeal,
  QuotaAction,
  RecipeJson,
  RegenerationReason,
  ReplacePreviewAlternative,
} from '@/shared/types/mealPlan';

const UNAUTHORIZED = {
  status: 401 as const,
  body: styleAError('UNAUTHORIZED', 'Authentication required.'),
};

const TRANSITIONS: MealPlanStatus[] = ['pending', 'generating', 'validating', 'ready'];
const QUOTA_LIMITS: Record<QuotaAction, { free: number; premium: number }> = {
  assistant: { free: 10, premium: 50 },
  plan_generate: { free: 2, premium: 5 },
  plan_regenerate: { free: 2, premium: 5 },
  recipe_generate: { free: 5, premium: 20 },
  replace_preview: { free: 5, premium: 20 },
};

const PROMPTS: (AssistantPromptOption & { intent: 'replace_meal' | 'get_recipe' | 'skip_meal' })[] =
  [
    { id: 1, display_text: 'Make dinner lighter', intent: 'replace_meal' },
    { id: 2, display_text: 'Show recipe', intent: 'get_recipe' },
    { id: 3, display_text: "I'm not hungry", intent: 'skip_meal' },
  ];

const PLAN_LIBRARY = [
  {
    meal_type: 'breakfast' as const,
    name: 'Masala oats with curd',
    serving_size: '1 bowl',
    rationale: 'High-fiber start with steady protein.',
    ingredients_json: [
      { name: 'Rolled oats', quantity: '50g' },
      { name: 'Curd', quantity: '120g' },
      { name: 'Mixed vegetables', quantity: '1 cup' },
    ],
    prep_time_minutes: 15,
  },
  {
    meal_type: 'lunch' as const,
    name: 'Chicken rice bowl',
    serving_size: '1 bowl',
    rationale: 'Simple carbs around the active part of your day.',
    ingredients_json: [
      { name: 'Rice', quantity: '160g cooked' },
      { name: 'Chicken', quantity: '140g' },
      { name: 'Salad', quantity: '1 cup' },
    ],
    prep_time_minutes: 25,
  },
  {
    meal_type: 'snack' as const,
    name: 'Fruit and whey',
    serving_size: '1 shake + fruit',
    rationale: 'Small bridge snack so dinner does not have to work too hard.',
    ingredients_json: [
      { name: 'Whey', quantity: '1 scoop' },
      { name: 'Banana', quantity: '1 medium' },
    ],
    prep_time_minutes: 5,
  },
  {
    meal_type: 'dinner' as const,
    name: 'Paneer quinoa stir-fry',
    serving_size: '1 plate',
    rationale: 'Protein-forward dinner with a lighter carb finish.',
    ingredients_json: [
      { name: 'Paneer', quantity: '120g' },
      { name: 'Quinoa', quantity: '120g cooked' },
      { name: 'Vegetables', quantity: '2 cups' },
    ],
    prep_time_minutes: 22,
  },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function planKey(userId: string, date: string): string {
  return `${userId}:${date}`;
}

function validDate(date: string | undefined): date is string {
  return Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
}

function quotaResetIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

function consumeQuota(user: MockUser, action: QuotaAction): MockResponse | null {
  const tier = user.is_premium ? 'premium' : 'free';
  const limit = QUOTA_LIMITS[action][tier];
  const key = `${action}:${user.id}:${todayISO()}`;
  const used = mockDb.quotaCounters[key] ?? 0;
  if (used >= limit) {
    return {
      status: 429,
      body: styleB({
        error: 'quota_exceeded',
        action,
        message: quotaMessage(action),
        limit,
        tier,
        quota_resets_at: quotaResetIso(),
      }),
    };
  }
  mockDb.quotaCounters[key] = used + 1;
  return null;
}

function quotaMessage(action: QuotaAction): string {
  if (action === 'plan_generate') return 'You have reached your daily plan generation limit.';
  if (action === 'plan_regenerate') return 'You have reached your daily plan regeneration limit.';
  if (action === 'replace_preview') return 'You have reached your daily meal-swap limit.';
  if (action === 'recipe_generate') return 'You have reached your daily recipe limit.';
  return 'You have reached your daily assistant limit.';
}

function profileFor(userId: string): DietProfile {
  return (
    mockDb.dietProfiles[userId] ?? {
      onboarding_complete: false,
      goal_type: 'eat_healthier',
      weight_kg: 70,
      target_weight_kg: null,
      height_cm: 175,
      activity_level: null,
      diet_type: null,
      allergies: [],
      disliked_foods: [],
      cuisine_preference: null,
      cooking_time_max: 30,
      meal_frequency: 4,
      budget_tier: null,
      eating_pattern: null,
      cooking_frequency: null,
      health_conditions: [],
      target_source: 'calculated',
      daily_calories: 2020,
      daily_protein_g: 120,
      daily_carbs_g: 240,
      daily_fat_g: 58,
    }
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function makeMeal(
  date: string,
  seed: (typeof PLAN_LIBRARY)[number],
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  replacementOfId: number | null = null,
): PlannedMeal {
  return {
    id: mockDb.nextPlannedMealId++,
    date,
    meal_type: seed.meal_type,
    name: seed.name,
    calories_kcal: Math.round(calories),
    protein_g: round1(protein),
    carbs_g: round1(carbs),
    fat_g: round1(fat),
    rationale: seed.rationale,
    recipe_json: null,
    replaced_at: null,
    replacement_of_id: replacementOfId,
    constraint_violation: false,
    status: 'planned',
    serving_size: seed.serving_size,
    portion_multiplier: 1,
    base_calories_kcal: Math.round(calories),
    base_protein_g: round1(protein),
    base_carbs_g: round1(carbs),
    base_fat_g: round1(fat),
    ingredients_json: seed.ingredients_json,
    prep_time_minutes: seed.prep_time_minutes,
    estimated_cost_tier: 'moderate',
    confidence_note: 'Mock estimate based on your current diet profile.',
  };
}

function createPlan(
  userId: string,
  date: string,
  planMode: 'standard' | 'historical',
): MealPlanDetail {
  const profile = profileFor(userId);
  const calories = profile.daily_calories || 2020;
  const protein = profile.daily_protein_g || 120;
  const carbs = profile.daily_carbs_g || 240;
  const fat = profile.daily_fat_g || 58;
  const splits = [0.24, 0.34, 0.14, 0.28];
  const meals = PLAN_LIBRARY.map((seed, index) =>
    makeMeal(
      date,
      seed,
      calories * splits[index],
      protein * splits[index],
      carbs * splits[index],
      fat * splits[index],
    ),
  );
  return {
    id: mockDb.nextMealPlanId++,
    status: 'pending',
    date_start: date,
    date_end: date,
    total_calories: Math.round(meals.reduce((sum, meal) => sum + meal.calories_kcal, 0)),
    total_protein_g: round1(meals.reduce((sum, meal) => sum + meal.protein_g, 0)),
    total_carbs_g: round1(meals.reduce((sum, meal) => sum + meal.carbs_g, 0)),
    total_fat_g: round1(meals.reduce((sum, meal) => sum + meal.fat_g, 0)),
    validation_result: {
      self_check_status: 'ok',
      macro_ok: true,
      violation_count: 0,
      self_check_issues: [],
    },
    self_check_status: 'ok',
    plan_mode: planMode,
    historical_fallback_reason: '',
    meals,
  };
}

function findPlan(date: string, userId: string): MealPlanDetail | null {
  return mockDb.mealPlans[planKey(userId, date)] ?? null;
}

function findMeal(plan: MealPlanDetail, mealId: number): PlannedMeal | null {
  return plan.meals.find((meal) => meal.id === mealId) ?? null;
}

function recipeFor(meal: PlannedMeal): RecipeJson {
  return {
    title: meal.name,
    ingredients: meal.ingredients_json,
    prep_time_minutes: meal.prep_time_minutes,
    note: meal.confidence_note || 'A practical mock recipe for the current plan.',
    steps: [
      'Prep the ingredients and keep the portion close to the serving size.',
      'Cook on medium heat until the protein is done and vegetables stay bright.',
      'Plate it simply, then log as planned if the portion matches.',
    ],
  };
}

function recomputeTotals(plan: MealPlanDetail): MealPlanDetail {
  const activeMeals = plan.meals.filter((meal) => meal.status !== 'replaced');
  return {
    ...plan,
    total_calories: Math.round(activeMeals.reduce((sum, meal) => sum + meal.calories_kcal, 0)),
    total_protein_g: round1(activeMeals.reduce((sum, meal) => sum + meal.protein_g, 0)),
    total_carbs_g: round1(activeMeals.reduce((sum, meal) => sum + meal.carbs_g, 0)),
    total_fat_g: round1(activeMeals.reduce((sum, meal) => sum + meal.fat_g, 0)),
  };
}

function createFoodEntryFromMeal(meal: PlannedMeal, calories = meal.calories_kcal): FoodEntry {
  const factor = meal.calories_kcal > 0 ? calories / meal.calories_kcal : 1;
  const entry: FoodEntry = {
    id: mockDb.nextFoodEntryId++,
    date: meal.date,
    meal_type: meal.meal_type,
    food_name: meal.name,
    calories: Math.round(calories),
    protein_g: round1(meal.protein_g * factor),
    carbs_g: round1(meal.carbs_g * factor),
    fat_g: round1(meal.fat_g * factor),
    source: 'plan',
    created_at: new Date().toISOString(),
  };
  mockDb.foodEntries.push(entry);
  return entry;
}

function alternativeFromMeal(
  meal: PlannedMeal,
  name: string,
  factor: number,
): ReplacePreviewAlternative {
  return {
    name,
    calories_kcal: Math.round(meal.calories_kcal * factor),
    protein_g: round1(meal.protein_g * factor),
    carbs_g: round1(meal.carbs_g * factor),
    fat_g: round1(meal.fat_g * factor),
    rationale:
      factor < 1 ? 'A lighter swap with similar protein.' : 'A steadier option with more fuel.',
    recipe_json: null,
    constraint_violation: false,
    serving_size: meal.serving_size,
    portion_multiplier: 1,
    base_calories_kcal: Math.round(meal.calories_kcal * factor),
    base_protein_g: round1(meal.protein_g * factor),
    base_carbs_g: round1(meal.carbs_g * factor),
    base_fat_g: round1(meal.fat_g * factor),
    ingredients_json: meal.ingredients_json,
    prep_time_minutes: meal.prep_time_minutes,
    estimated_cost_tier: meal.estimated_cost_tier,
    confidence_note: 'Generated as a mock replacement preview.',
  };
}

function parsePlanMode(value: unknown): 'standard' | 'historical' | null {
  if (value === undefined || value === null || value === '') return 'standard';
  return value === 'standard' || value === 'historical' ? value : null;
}

function auth(request: MockRequest): MockUser | MockResponse {
  return requireMockUser(request) ?? UNAUTHORIZED;
}

registerMock('POST', '/meal-plans/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const body = (request.body ?? {}) as { date?: string; plan_mode?: unknown };
  if (!validDate(body.date)) return { status: 400, body: styleB({ error: 'invalid_date' }) };
  const planMode = parsePlanMode(body.plan_mode);
  if (!planMode) {
    return {
      status: 400,
      body: styleB({ error: 'invalid_plan_mode', valid: ['standard', 'historical'] }),
    };
  }

  const key = planKey(user.id, body.date);
  const existing = mockDb.mealPlans[key];
  if (existing) {
    return {
      status: 200,
      delayMs: 200,
      body: styleB<MealPlanCreateResponse>({ plan_id: existing.id, status: existing.status }),
    };
  }

  const quota = consumeQuota(user, 'plan_generate');
  if (quota) return quota;
  const plan = createPlan(user.id, body.date, planMode);
  mockDb.mealPlans[key] = plan;
  mockDb.mealPlanPollCounts[key] = 0;
  return {
    status: 202,
    delayMs: 300,
    body: styleB<MealPlanCreateResponse>({ plan_id: plan.id, status: plan.status }),
  };
});

registerMock('GET', '/meal-plans/:date/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const date = request.params.date;
  if (!validDate(date)) return { status: 400, body: styleB({ error: 'invalid_date' }) };
  const key = planKey(user.id, date);
  const plan = mockDb.mealPlans[key];
  if (!plan) return { status: 404, delayMs: 200, body: styleB({ error: 'plan_not_found' }) };
  const polls = (mockDb.mealPlanPollCounts[key] ?? 0) + 1;
  mockDb.mealPlanPollCounts[key] = polls;
  const advanced = advanceOnPoll(plan, TRANSITIONS, polls);
  mockDb.mealPlans[key] = advanced;
  return {
    status: 200,
    delayMs: 250,
    body: styleB({
      ...advanced,
      meals: advanced.meals.filter((meal) => meal.status !== 'replaced'),
    }),
  };
});

registerMock('POST', '/meal-plans/:date/regenerate/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const date = request.params.date;
  const body = (request.body ?? {}) as {
    regeneration_reason?: RegenerationReason;
    plan_mode?: unknown;
  };
  if (!validDate(date)) return { status: 400, body: styleB({ error: 'invalid_date' }) };
  if (!body.regeneration_reason) {
    return { status: 400, body: styleB({ error: 'invalid_regeneration_reason' }) };
  }
  const planMode = parsePlanMode(body.plan_mode);
  if (!planMode) {
    return {
      status: 400,
      body: styleB({ error: 'invalid_plan_mode', valid: ['standard', 'historical'] }),
    };
  }
  const quota = consumeQuota(user, 'plan_regenerate');
  if (quota) return quota;
  const key = planKey(user.id, date);
  const plan = createPlan(user.id, date, planMode);
  mockDb.mealPlans[key] = plan;
  mockDb.mealPlanPollCounts[key] = 0;
  return {
    status: 202,
    delayMs: 300,
    body: styleB<MealPlanCreateResponse>({ plan_id: plan.id, status: plan.status }),
  };
});

registerMock('GET', '/meal-plans/:date/meals/:mealId/recipe/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (!mockDb.generatedRecipeMealIds.has(meal.id)) {
    const quota = consumeQuota(user, 'recipe_generate');
    if (quota) return quota;
    mockDb.generatedRecipeMealIds.add(meal.id);
  }
  meal.recipe_json = meal.recipe_json ?? recipeFor(meal);
  return { status: 200, delayMs: 300, body: styleB(meal.recipe_json) };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/log/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (meal.status === 'replaced') return { status: 409, body: styleB({ error: 'meal_replaced' }) };
  if (meal.status === 'logged_as_planned' || meal.status === 'logged_modified') {
    return { status: 200, body: styleB({ id: meal.id, status: meal.status }) };
  }
  const body = (request.body ?? {}) as { actual_calories?: number };
  const actualCalories = body.actual_calories ?? meal.calories_kcal;
  const entry = createFoodEntryFromMeal(meal, actualCalories);
  meal.status = actualCalories === meal.calories_kcal ? 'logged_as_planned' : 'logged_modified';
  return {
    status: 200,
    delayMs: 250,
    body: styleB({ id: meal.id, status: meal.status, food_entry_id: entry.id }),
  };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/skip/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (meal.status === 'skipped') return { status: 409, body: styleB({ error: 'already_skipped' }) };
  meal.status = 'skipped';
  return { status: 200, delayMs: 200, body: styleB({ status: meal.status }) };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/adjust-quantity/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (meal.status === 'replaced') return { status: 409, body: styleB({ error: 'meal_replaced' }) };
  const body = (request.body ?? {}) as { portion_multiplier?: number };
  const multiplier = Number(body.portion_multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 0.01 || multiplier > 3) {
    return { status: 400, body: styleB({ error: 'invalid_portion_multiplier' }) };
  }
  meal.portion_multiplier = multiplier;
  meal.calories_kcal = Math.round((meal.base_calories_kcal ?? meal.calories_kcal) * multiplier);
  meal.protein_g = round1((meal.base_protein_g ?? meal.protein_g) * multiplier);
  meal.carbs_g = round1((meal.base_carbs_g ?? meal.carbs_g) * multiplier);
  meal.fat_g = round1((meal.base_fat_g ?? meal.fat_g) * multiplier);
  mockDb.mealPlans[planKey(user.id, request.params.date)] = recomputeTotals(plan);
  return {
    status: 200,
    delayMs: 200,
    body: styleB({
      status: 'ok',
      calories_kcal: meal.calories_kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    }),
  };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/feedback/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  const body = (request.body ?? {}) as { feedback_type?: FeedbackType };
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (!body.feedback_type) return { status: 400, body: styleB({ error: 'invalid_feedback_type' }) };
  return { status: 201, delayMs: 200, body: styleB({ id: mockDb.nextMealFeedbackId++ }) };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/replace/preview/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const quota = consumeQuota(user, 'replace_preview');
  if (quota) return quota;
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  const alternatives = [
    alternativeFromMeal(meal, 'Tofu stir-fry, brown rice', 0.92),
    alternativeFromMeal(meal, 'Egg bhurji wrap', 0.84),
    alternativeFromMeal(meal, 'Dal, rice, cucumber bowl', 1.02),
  ];
  const token = `replace-${meal.id}-${Date.now()}`;
  mockDb.replacePreviews[token] = {
    userId: user.id,
    mealId: meal.id,
    alternatives,
    expiresAt: Date.now() + 600_000,
  };
  return { status: 200, delayMs: 500, body: styleB({ alternatives, preview_token: token }) };
});

registerMock('POST', '/meal-plans/:date/meals/:mealId/replace/confirm/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const body = (request.body ?? {}) as { preview_token?: string; chosen_index?: number };
  const previewToken = body.preview_token;
  const preview = previewToken ? mockDb.replacePreviews[previewToken] : null;
  if (!previewToken || !preview || preview.userId !== user.id || preview.expiresAt < Date.now()) {
    return { status: 404, body: styleB({ error: 'preview_not_found' }) };
  }
  const alternative = preview.alternatives[Number(body.chosen_index)];
  if (!alternative) return { status: 400, body: styleB({ error: 'invalid_chosen_index' }) };
  const plan = findPlan(request.params.date, user.id);
  const meal = plan ? findMeal(plan, Number(request.params.mealId)) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  meal.status = 'replaced';
  meal.replaced_at = new Date().toISOString();
  const replacement: PlannedMeal = {
    ...alternative,
    id: mockDb.nextPlannedMealId++,
    date: request.params.date,
    meal_type: meal.meal_type,
    status: 'planned',
    replaced_at: null,
    replacement_of_id: meal.id,
  };
  plan.meals.push(replacement);
  mockDb.mealPlans[planKey(user.id, request.params.date)] = recomputeTotals(plan);
  delete mockDb.replacePreviews[previewToken];
  return { status: 200, delayMs: 250, body: styleB({ status: 'ok', meal_id: replacement.id }) };
});

registerMock('POST', '/meal-plans/:date/ate-something-else/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const plan = findPlan(request.params.date, user.id);
  if (!plan) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  const body = (request.body ?? {}) as {
    meal_type?: MealType;
    planned_meal_id?: number;
    description?: string;
    approx_calories?: number;
    approx_protein_g?: number;
  };
  const meal = body.planned_meal_id
    ? findMeal(plan, Number(body.planned_meal_id))
    : plan.meals.find((candidate) => candidate.meal_type === body.meal_type);
  if (!meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  if (meal.status === 'eaten_outside') {
    return { status: 409, body: styleB({ error: 'already_eaten_outside' }) };
  }
  meal.status = 'eaten_outside';
  const entry: FoodEntry = {
    id: mockDb.nextFoodEntryId++,
    date: request.params.date,
    meal_type: meal.meal_type,
    food_name: body.description ?? 'Something else',
    calories: Math.round(body.approx_calories ?? 500),
    protein_g: round1(body.approx_protein_g ?? 0),
    carbs_g: 0,
    fat_g: 0,
    source: 'plan',
    created_at: new Date().toISOString(),
  };
  mockDb.foodEntries.push(entry);
  const profile = profileFor(user.id);
  const consumed = mockDb.foodEntries
    .filter((candidate) => candidate.date === request.params.date)
    .reduce((sum, candidate) => sum + candidate.calories, 0);
  return {
    status: 200,
    delayMs: 250,
    body: styleB({
      status: 'ok',
      food_entry_id: entry.id,
      remaining_calories: Math.round((profile.daily_calories || 2020) - consumed),
    }),
  };
});

registerMock('GET', '/meals/assistant-prompts/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  if (!request.query.context) return { status: 400, body: styleB({ error: 'context_required' }) };
  if (request.query.context !== 'meal_plan') {
    return { status: 400, body: styleB({ error: 'invalid_context', valid: ['meal_plan'] }) };
  }
  return { status: 200, delayMs: 200, body: styleB({ options: PROMPTS }) };
});

registerMock('POST', '/meal-plans/:date/assistant/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const quota = consumeQuota(user, 'assistant');
  if (quota) return quota;
  const plan = findPlan(request.params.date, user.id);
  if (!plan) return { status: 404, body: styleB({ error: 'plan_not_found' }) };
  const body = (request.body ?? {}) as { prompt_option_id?: number };
  const prompt = PROMPTS.find((candidate) => candidate.id === body.prompt_option_id);
  if (!prompt) return { status: 404, body: styleB({ error: 'prompt_option_not_found' }) };
  const meal = plan.meals.find((candidate) => candidate.status === 'planned') ?? plan.meals[0];
  if (prompt.intent === 'get_recipe')
    return { status: 200, body: styleB({ recipe: recipeFor(meal) }) };
  const proposalId = `proposal-${prompt.id}-${Date.now()}`;
  mockDb.assistantProposals[proposalId] = {
    userId: user.id,
    date: request.params.date,
    intent: prompt.intent,
    mealId: meal.id,
    expiresAt: Date.now() + 600_000,
  };
  return {
    status: 200,
    delayMs: 400,
    body: styleB({
      proposal_id: proposalId,
      summary:
        prompt.intent === 'skip_meal'
          ? `Skip ${meal.name} and keep the rest of today steady.`
          : `Swap ${meal.name} for a lighter option.`,
      requires_confirmation: true,
      preview: { meal },
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    }),
  };
});

registerMock('POST', '/meal-plans/:date/assistant/confirm/', (request) => {
  const user = auth(request);
  if ('status' in user) return user;
  const body = (request.body ?? {}) as { proposal_id?: string };
  const proposalId = body.proposal_id;
  const proposal = proposalId ? mockDb.assistantProposals[proposalId] : null;
  if (!proposalId || !proposal || proposal.userId !== user.id || proposal.expiresAt < Date.now()) {
    return { status: 404, body: styleB({ error: 'proposal_not_found' }) };
  }
  const plan = findPlan(proposal.date, user.id);
  const meal = plan && proposal.mealId ? findMeal(plan, proposal.mealId) : null;
  if (!plan || !meal) return { status: 404, body: styleB({ error: 'meal_not_found' }) };
  delete mockDb.assistantProposals[proposalId];
  if (proposal.intent === 'skip_meal') {
    meal.status = 'skipped';
    return { status: 200, delayMs: 250, body: styleB({ status: 'skipped' }) };
  }
  const replacement = makeMeal(
    proposal.date,
    { ...PLAN_LIBRARY[3], meal_type: meal.meal_type, name: 'Lighter tofu bowl' },
    meal.calories_kcal * 0.82,
    meal.protein_g,
    meal.carbs_g * 0.7,
    meal.fat_g * 0.8,
    meal.id,
  );
  meal.status = 'replaced';
  meal.replaced_at = new Date().toISOString();
  plan.meals.push(replacement);
  mockDb.mealPlans[planKey(user.id, proposal.date)] = recomputeTotals(plan);
  return { status: 200, delayMs: 250, body: styleB({ status: 'ok', meal_id: replacement.id }) };
});
