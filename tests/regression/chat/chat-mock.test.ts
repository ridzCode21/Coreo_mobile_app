/**
 * Issue #43 — 18c Chat presence. Protects the mock side of `POST /users/me/chat/`, `/confirm/`,
 * `/undo/` directly against the mock router (same style as
 * `tests/regression/nutrition/label-ocr-mock.test.ts`), transcribed from the real backend service
 * `apps/users/services/chat.py:75-176` (plan.md "Backend alignment" has the full field-by-field
 * citation). The clock is pinned to a Tuesday so the documented API_REFERENCE.md example (Push
 * session → Thursday) is reproducible, and so a Python-weekday-vs-JS-weekday mixup
 * (plan.md Decision 8) would show up as the wrong lift word instead of silently passing.
 */

import '@/shared/api/mock/registerAllMocks';
import { resolveMock } from '@/shared/api/mock/router';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';
import type { MealPlanDetail } from '@/shared/types/mealPlan';
import type { FitnessProfile } from '@/shared/types/fitnessProfile';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';

// Tuesday, matching the API_REFERENCE.md:946-972 documented example verbatim ("Push session").
const TUESDAY = new Date('2026-10-20T12:00:00.000Z');
const TODAY_ISO = '2026-10-20';

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

function seedCompleteFitnessProfile(userId: string) {
  const profile: FitnessProfile = {
    fitness_interview_complete: true,
    fitness_goal: 'build_muscle',
    training_places: ['full_gym'],
    movement_note: '',
    sports: [],
    protected_areas: [],
  };
  mockDb.fitnessProfiles[userId] = profile;
}

function seedCompleteWellnessProfile(userId: string) {
  const profile: WellnessProfile = {
    wellness_interview_complete: true,
    wellness_focus: 'racing_mind',
    nights_note: 'Up late scrolling.',
    morning_first: 'phone',
    what_helps: ['chai'],
    check_in_style: 'step_in',
    hide_numbers: false,
  };
  mockDb.wellnessProfiles[userId] = profile;
}

function seedDinnerPlan(userId: string, date: string) {
  const plan = {
    id: 1,
    status: 'ready',
    failure_reason: '',
    date_start: date,
    date_end: date,
    total_calories: 2000,
    total_protein_g: 120,
    total_carbs_g: 220,
    total_fat_g: 60,
    validation_result: {
      self_check_status: 'ok',
      macro_ok: true,
      violation_count: 0,
      self_check_issues: [],
    },
    self_check_status: 'ok',
    plan_mode: 'standard',
    historical_fallback_reason: '',
    meals: [
      {
        id: 501,
        date,
        meal_type: 'dinner',
        name: 'Paneer quinoa stir-fry',
        calories_kcal: 560,
        protein_g: 34,
        carbs_g: 60,
        fat_g: 18,
        rationale: 'Protein-forward dinner with a lighter carb finish.',
        recipe_json: null,
        replaced_at: null,
        replacement_of_id: null,
        constraint_violation: false,
        status: 'planned',
        serving_size: '1 plate',
        portion_multiplier: 1,
        base_calories_kcal: 560,
        base_protein_g: 34,
        base_carbs_g: 60,
        base_fat_g: 18,
        ingredients_json: [],
        prep_time_minutes: 22,
        estimated_cost_tier: 'moderate',
        confidence_note: '',
      },
    ],
  } as unknown as MealPlanDetail;
  mockDb.mealPlans[`${userId}:${date}`] = plan;
  return plan;
}

function request(
  overrides: Partial<MockRequest> & Pick<MockRequest, 'method' | 'path'>,
): MockRequest {
  return { params: {}, query: {}, headers: {}, ...overrides };
}

async function callChat(token: string | null, body?: unknown) {
  const match = resolveMock('POST', '/users/me/chat/');
  if (!match) throw new Error('POST /users/me/chat/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/users/me/chat/',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
}

async function callConfirm(token: string, proposalId: unknown) {
  const match = resolveMock('POST', '/users/me/chat/confirm/');
  if (!match) throw new Error('POST /users/me/chat/confirm/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/users/me/chat/confirm/',
      headers: { Authorization: `Bearer ${token}` },
      body: { proposal_id: proposalId },
    }),
  );
}

async function callUndo(token: string, proposalId: unknown) {
  const match = resolveMock('POST', '/users/me/chat/undo/');
  if (!match) throw new Error('POST /users/me/chat/undo/ is not registered');
  return match.handler(
    request({
      method: 'POST',
      path: '/users/me/chat/undo/',
      headers: { Authorization: `Bearer ${token}` },
      body: { proposal_id: proposalId },
    }),
  );
}

describe('chat mock: POST /users/me/chat/ (issue #43)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
    jest.useFakeTimers().setSystemTime(TUESDAY);
  });
  afterEach(() => jest.useRealTimers());

  it('is registered for propose, confirm, and undo', () => {
    expect(resolveMock('POST', '/users/me/chat/')).toBeDefined();
    expect(resolveMock('POST', '/users/me/chat/confirm/')).toBeDefined();
    expect(resolveMock('POST', '/users/me/chat/undo/')).toBeDefined();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await callChat(null, { message: 'move my session to Thursday' });
    expect(response.status).toBe(401);
  });

  it('400s on a blank message (services/chat.py:222-230)', async () => {
    const user = seedUser('chat-user-blank');
    const { access } = issueTokenPair(user);

    const response = await callChat(access, { message: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'message_required' });
  });

  it('400s on a message over 2000 characters (MAX_MESSAGE, services/chat.py:25,231-232)', async () => {
    const user = seedUser('chat-user-long');
    const { access } = issueTokenPair(user);

    const response = await callChat(access, { message: 'a'.repeat(2001) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'message_too_long' });
  });

  it('reproduces the API_REFERENCE.md:946-972 full-match example verbatim on a Tuesday', async () => {
    const user = seedUser('chat-user-full');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const response = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body.listening).toBe('Listening');
    expect(body.heard).toBe('"...skipped lunch, and I really don\'t feel like the gym."');
    expect(body.line).toBe(
      "Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday.",
    );
    expect(body.hint).toBe('Hold to talk · tap the bubble to type');
    expect(body.requires_confirmation).toBe(true);
    expect(typeof body.proposal_id).toBe('string');
    const receipts = body.receipts as { pillar: string; label: string; summary: string }[];
    expect(receipts).toHaveLength(3);
    expect(receipts.map((r) => r.pillar)).toEqual(['fitness', 'diet', 'wellness']);
    expect(receipts[0].label).toBe('Fitness moved');
    expect(receipts[0].summary).toBe('Push session → 20-min walk on your 7 PM call');
    expect(receipts[1].label).toBe('Dinner set');
    expect(receipts[2].label).toBe('Wind-down 9:30');
  });

  it('returns no receipts/proposal and stores no row when no pillar is named', async () => {
    const user = seedUser('chat-user-nomatch');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const response = await callChat(access, { message: 'just saying hi' });

    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body.receipts).toEqual([]);
    expect(body.proposal_id).toBeNull();
    expect(body.requires_confirmation).toBe(false);
    expect(body.line).toBeNull();
    expect(body.heard).toBe('just saying hi');

    // No row was stored, so confirming a made-up id 404s, not any other status.
    const confirmAttempt = await callConfirm(access, 'not-a-real-proposal');
    expect(confirmAttempt.status).toBe(404);
  });

  it('confirm applies the dinner rename and returns applied: true', async () => {
    const user = seedUser('chat-user-confirm');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;

    const confirm = await callConfirm(access, proposalId);

    expect(confirm.status).toBe(200);
    expect(confirm.body).toMatchObject({ proposal_id: proposalId, applied: true });
    const meal = mockDb.mealPlans[`${user.id}:${TODAY_ISO}`].meals[0];
    expect(meal.name).toBe('Dal, rice, and sabzi');
    expect(meal.rationale).toBe('Covers the protein lunch missed. Late + heavy is the 4 AM wake.');
  });

  it('confirming twice 409s already_applied', async () => {
    const user = seedUser('chat-user-confirm-twice');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;
    await callConfirm(access, proposalId);

    const second = await callConfirm(access, proposalId);

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'already_applied' });
  });

  it('undo restores the original dinner and returns undone: true', async () => {
    const user = seedUser('chat-user-undo');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;
    await callConfirm(access, proposalId);

    const undo = await callUndo(access, proposalId);

    expect(undo.status).toBe(200);
    expect(undo.body).toMatchObject({ proposal_id: proposalId, undone: true });
    const meal = mockDb.mealPlans[`${user.id}:${TODAY_ISO}`].meals[0];
    expect(meal.name).toBe('Paneer quinoa stir-fry');
    expect(meal.rationale).toBe('Protein-forward dinner with a lighter carb finish.');
  });

  it('undo restores the referenced dinner when the user has more than one meal plan', async () => {
    const user = seedUser('chat-user-undo-many-plans');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    const olderPlan = seedDinnerPlan(user.id, '2026-10-19');
    olderPlan.id = 2;
    olderPlan.meals[0].id = 500;
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;
    await callConfirm(access, proposalId);

    await callUndo(access, proposalId);

    expect(mockDb.mealPlans[`${user.id}:${TODAY_ISO}`].meals[0].name).toBe(
      'Paneer quinoa stir-fry',
    );
  });

  it('undo before confirm 409s not_applied', async () => {
    const user = seedUser('chat-user-undo-early');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;

    const undo = await callUndo(access, proposalId);

    expect(undo.status).toBe(409);
    expect(undo.body).toEqual({ error: 'not_applied' });
  });

  it('undoing twice 409s already_undone', async () => {
    const user = seedUser('chat-user-undo-twice');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const propose = await callChat(access, {
      message: "...skipped lunch, and I really don't feel like the gym.",
    });
    const proposalId = (propose.body as Record<string, unknown>).proposal_id as string;
    await callConfirm(access, proposalId);
    await callUndo(access, proposalId);

    const second = await callUndo(access, proposalId);

    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'already_undone' });
  });

  it('confirm/undo with a garbage proposal id 404s proposal_not_found', async () => {
    const user = seedUser('chat-user-garbage');
    const { access } = issueTokenPair(user);

    const confirm = await callConfirm(access, 'does-not-exist');
    const undo = await callUndo(access, 'does-not-exist');

    expect(confirm.status).toBe(404);
    expect(confirm.body).toEqual({ error: 'proposal_not_found' });
    expect(undo.status).toBe(404);
    expect(undo.body).toEqual({ error: 'proposal_not_found' });
  });

  it('suppresses a repeat wind-down receipt the same day once a turn with one has been applied (plan.md Decision 9)', async () => {
    const user = seedUser('chat-user-wind-repeat');
    seedCompleteFitnessProfile(user.id);
    seedCompleteWellnessProfile(user.id);
    seedDinnerPlan(user.id, TODAY_ISO);
    const { access } = issueTokenPair(user);

    const first = await callChat(access, { message: 'move wind-down up to 9:30' });
    const firstBody = first.body as Record<string, unknown>;
    expect((firstBody.receipts as { label: string }[]).map((r) => r.label)).toContain(
      'Wind-down 9:30',
    );
    await callConfirm(access, firstBody.proposal_id as string);

    const second = await callChat(access, { message: 'move wind-down up to 9:30' });
    const secondBody = second.body as Record<string, unknown>;
    expect((secondBody.receipts as { label: string }[]).map((r) => r.label)).not.toContain(
      'Wind-down 9:30',
    );
  });

  it('a Monday message moves the lift to "legs", not "push" (plan.md Decision 8: Python Monday=0 vs JS Monday=1)', async () => {
    jest.setSystemTime(new Date('2026-10-19T12:00:00.000Z')); // Monday
    const user = seedUser('chat-user-monday');
    seedCompleteFitnessProfile(user.id);
    const { access } = issueTokenPair(user);

    const response = await callChat(access, { message: "I don't feel like the gym today" });

    const receipts = (response.body as Record<string, unknown>).receipts as {
      summary: string;
    }[];
    expect(receipts[0].summary).toContain('Legs session');
    expect(receipts[0].summary).not.toContain('Push session');
  });
});
