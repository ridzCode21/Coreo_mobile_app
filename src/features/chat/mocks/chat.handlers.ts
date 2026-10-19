import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockChatTurn, type MockUser } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock, type MockResponse } from '@/shared/api/mock/router';
import type { ChatReceipt } from '@/shared/types/chat';

const HEARD = '"...skipped lunch, and I really don\'t feel like the gym."';
const LINE =
  "Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday.";
const FITNESS_LINE = "Then we don't. Walk your 7 PM call, I've moved your session to Thursday.";
const DINNER_LINE = 'Eat a real dinner before 7:30.';
const HINT = 'Hold to talk · tap the bubble to type';
const DINNER_NAME = 'Dal, rice, and sabzi';
const DINNER_RATIONALE = 'Covers the protein lunch missed. Late + heavy is the 4 AM wake.';
const MAX_MESSAGE = 2000;

const LUNCH_PHRASES = ['skipped lunch', 'skip lunch', 'no lunch'];
const GYM_PHRASES = [
  "don't feel like the gym",
  'dont feel like the gym',
  'do not feel like the gym',
  "don't feel like gym",
  'not feel like the gym',
  'skip the gym',
  'skip gym',
  "don't want the gym",
  'dont want the gym',
];
const LIFT_BY_JS_WEEKDAY: Partial<Record<number, 'legs' | 'push' | 'pull'>> = {
  1: 'legs',
  2: 'push',
  5: 'pull',
};
const SESSION_WORD = { legs: 'Legs', push: 'Push', pull: 'Pull' } as const;

const DINNER_RECEIPT: ChatReceipt = {
  pillar: 'diet',
  kind: 'suggested',
  label: 'Dinner set',
  summary: 'Dinner before 7:30, dal, rice, sabzi',
  detail: DINNER_RATIONALE,
};
const WIND_RECEIPT: ChatReceipt = {
  pillar: 'wellness',
  kind: 'moved_up',
  label: 'Wind-down 9:30',
  summary: 'Wind-down starts 9:30 tonight, not 9:45',
  detail: 'Days like this one are exactly when it matters.',
};

function unauthorized(): MockResponse {
  return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
}

function chatError(status: number, error: string): MockResponse {
  return { status, body: { error } };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function thursdayAfter(date: string): string {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const delta = (4 - weekday + 7) % 7 || 7;
  return addDays(date, delta);
}

function makeProposalId(): string {
  const random = Math.random().toString(16).slice(2).padEnd(20, '0');
  const time = Date.now().toString(16).padStart(12, '0').slice(-12);
  return `${time.slice(0, 8)}-${time.slice(8)}-4000-8000-${random.slice(0, 12)}`;
}

function parseMessage(body: unknown): { message: string } | MockResponse {
  if (!body || typeof body !== 'object') {
    return chatError(400, 'message_required');
  }
  const raw = (body as { message?: unknown }).message;
  if (typeof raw !== 'string' || !raw.trim()) return chatError(400, 'message_required');
  const message = raw.trim();
  if (message.length > MAX_MESSAGE) return chatError(400, 'message_too_long');
  return { message };
}

function isMockResponse(value: { message: string } | MockResponse): value is MockResponse {
  return 'status' in value;
}

function fitnessEffect(user: MockUser, today: string): MockChatTurn['effects']['fitness'] {
  if (!mockDb.fitnessProfiles[user.id]?.fitness_interview_complete) return undefined;
  const sessionKey = LIFT_BY_JS_WEEKDAY[new Date(`${today}T12:00:00.000Z`).getUTCDay()];
  if (!sessionKey) return undefined;
  const block = mockDb.trainingBlocks[user.id];
  if (block && today < block.started_on) return undefined;
  const alreadyMoved = Object.values(mockDb.chatTurns).some(
    (turn) =>
      turn.userId === user.id &&
      turn.status === 'applied' &&
      turn.effects.fitness?.from_date === today,
  );
  if (alreadyMoved) return undefined;
  return { session_key: sessionKey, from_date: today, to_date: thursdayAfter(today) };
}

function dinnerEffect(user: MockUser, today: string): MockChatTurn['effects']['dinner'] {
  const plan = mockDb.mealPlans[`${user.id}:${today}`];
  if (!plan) return undefined;
  const meal = [...plan.meals]
    .filter((item) => item.meal_type === 'dinner' && item.replaced_at === null)
    .sort((a, b) => b.id - a.id)[0];
  return meal ? { plan_id: plan.id, meal_id: meal.id } : undefined;
}

function windEffect(user: MockUser, today: string): MockChatTurn['effects']['wind_down'] {
  if (!mockDb.wellnessProfiles[user.id]?.wellness_interview_complete) return undefined;
  const alreadyMoved = Object.values(mockDb.chatTurns).some(
    (turn) =>
      turn.userId === user.id &&
      turn.status === 'applied' &&
      turn.effects.wind_down?.local_date === today,
  );
  return alreadyMoved ? undefined : { local_date: today, start: '9:30' };
}

function responseLine(receipts: ChatReceipt[]): string | null {
  const pillars = new Set(receipts.map((receipt) => receipt.pillar));
  if (pillars.has('fitness') && pillars.has('diet')) return LINE;
  if (pillars.has('fitness')) return FITNESS_LINE;
  if (pillars.has('diet')) return DINNER_LINE;
  return null;
}

function findTurn(user: MockUser, body: unknown): MockChatTurn | MockResponse {
  if (!body || typeof body !== 'object') return chatError(404, 'proposal_not_found');
  const proposalId = (body as { proposal_id?: unknown }).proposal_id;
  if (typeof proposalId !== 'string' || !proposalId.trim()) {
    return chatError(404, 'proposal_not_found');
  }
  const turn = mockDb.chatTurns[proposalId];
  return turn?.userId === user.id ? turn : chatError(404, 'proposal_not_found');
}

function isTurn(value: MockChatTurn | MockResponse): value is MockChatTurn {
  return 'userId' in value;
}

registerMock('POST', '/users/me/chat/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const parsed = parseMessage(request.body);
  if (isMockResponse(parsed)) return parsed;

  const message = parsed.message;
  const text = message.replace(/[‘’]/g, "'").toLowerCase();
  const skipped = LUNCH_PHRASES.some((phrase) => text.includes(phrase));
  const noGym = GYM_PHRASES.some((phrase) => text.includes(phrase));
  const asksWind = /wind[\s-]?down/i.test(text) && /\bup\b|earlier|9:30|9\.30/i.test(text);
  const today = todayISO();
  const receipts: ChatReceipt[] = [];
  const effects: MockChatTurn['effects'] = {};

  if (noGym) {
    const effect = fitnessEffect(user, today);
    if (effect) {
      effects.fitness = effect;
      receipts.push({
        pillar: 'fitness',
        kind: 'changed',
        label: 'Fitness moved',
        summary: `${SESSION_WORD[effect.session_key]} session → 20-min walk on your 7 PM call`,
        detail: 'Session moves to Thursday. The week still adds up.',
      });
    }
  }
  if (skipped) {
    const effect = dinnerEffect(user, today);
    if (effect) {
      effects.dinner = effect;
      receipts.push({ ...DINNER_RECEIPT });
    }
  }
  if (skipped || asksWind) {
    const effect = windEffect(user, today);
    if (effect) {
      effects.wind_down = effect;
      receipts.push({ ...WIND_RECEIPT });
    }
  }

  let proposalId: string | null = null;
  if (receipts.length) {
    proposalId = makeProposalId();
    mockDb.chatTurns[proposalId] = {
      id: proposalId,
      userId: user.id,
      message,
      status: 'proposed',
      receipts,
      effects,
      before: null,
      createdAt: Date.now(),
      appliedAt: null,
    };
  }

  return {
    status: 200,
    body: {
      listening: 'Listening',
      heard: skipped && noGym ? HEARD : message,
      line: responseLine(receipts),
      receipts,
      hint: HINT,
      proposal_id: proposalId,
      requires_confirmation: receipts.length > 0,
    },
  };
});

registerMock('POST', '/users/me/chat/confirm/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const result = findTurn(user, request.body);
  if (!isTurn(result)) return result;
  if (result.status === 'applied') return chatError(409, 'already_applied');
  if (result.status === 'undone') return chatError(409, 'already_undone');

  const dinner = result.effects.dinner;
  if (dinner) {
    const plan = Object.entries(mockDb.mealPlans).find(
      ([key, candidate]) =>
        key.startsWith(`${user.id}:`) &&
        candidate.id === dinner.plan_id &&
        candidate.meals.some((meal) => meal.id === dinner.meal_id),
    )?.[1];
    const meal = plan?.meals.find(
      (candidate) =>
        candidate.id === dinner.meal_id &&
        candidate.meal_type === 'dinner' &&
        candidate.replaced_at === null,
    );
    if (!meal) return chatError(409, 'nothing_to_apply');
    result.before = { dinner: { meal_id: meal.id, name: meal.name, rationale: meal.rationale } };
    meal.name = DINNER_NAME;
    meal.rationale = DINNER_RATIONALE;
  } else {
    result.before = {};
  }
  result.status = 'applied';
  result.appliedAt = Date.now();
  return {
    status: 200,
    body: { proposal_id: result.id, applied: true, receipts: result.receipts },
  };
});

registerMock('POST', '/users/me/chat/undo/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const result = findTurn(user, request.body);
  if (!isTurn(result)) return result;
  if (result.status === 'proposed') return chatError(409, 'not_applied');
  if (result.status === 'undone') return chatError(409, 'already_undone');

  const latest = Object.values(mockDb.chatTurns)
    .filter((turn) => turn.userId === user.id && turn.status === 'applied')
    .sort((a, b) => (b.appliedAt ?? 0) - (a.appliedAt ?? 0) || b.createdAt - a.createdAt)[0];
  if (!latest || latest.id !== result.id) return chatError(409, 'not_latest');

  const snapshot = result.before?.dinner;
  if (snapshot) {
    const meal = Object.entries(mockDb.mealPlans)
      .filter(([key]) => key.startsWith(`${user.id}:`))
      .flatMap(([, plan]) => plan.meals)
      .find((candidate) => candidate.id === snapshot.meal_id);
    if (meal) {
      meal.name = snapshot.name;
      meal.rationale = snapshot.rationale;
    }
  }
  result.status = 'undone';
  return {
    status: 200,
    body: { proposal_id: result.id, undone: true, receipts: result.receipts },
  };
});
