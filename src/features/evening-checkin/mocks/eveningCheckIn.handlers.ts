import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { registerMock } from '@/shared/api/mock/router';
import type { EveningCheckInMoodKey } from '@/shared/types/eveningCheckIn';

const MOODS = [
  { key: 'rough', label: 'Rough' },
  { key: 'meh', label: 'Meh' },
  { key: 'okay', label: 'Okay' },
  { key: 'good', label: 'Good' },
  { key: 'great', label: 'Great' },
] as const;
const NOTE_LIMIT = 500;
const PUSH_LINE = "Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here.";
const SMALL_LINE = "Tomorrow stays small. Lights out 10:45. I'll take it from here.";

function localToday(user: MockUser, moment = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: user.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(moment)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function unauthorized() {
  return { status: 401, body: { detail: 'Authentication credentials were not provided.' } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMoodKey(value: unknown): value is EveningCheckInMoodKey {
  return MOODS.some((option) => option.key === value);
}

function weekday(date: string): string {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
}

function recap(user: MockUser, today: string): string[] {
  const profile = mockDb.wellnessProfiles[user.id];
  const lines: string[] = [];
  const steps = mockDb.dailyLogs[`${user.id}:${today}`]?.steps;
  if (steps != null && !profile?.hide_numbers) {
    lines.push(`${steps.toLocaleString('en-US')} steps`);
  }
  const lunch = mockDb.foodEntries
    .filter((entry) => entry.date === today && entry.meal_type === 'lunch')
    .sort(
      (left, right) => right.created_at.localeCompare(left.created_at) || right.id - left.id,
    )[0];
  if (lunch) lines.push(`Lunch logged · ${lunch.food_name}`);
  const moved = Object.values(mockDb.chatTurns).find(
    (turn) =>
      turn.userId === user.id &&
      turn.status === 'applied' &&
      turn.effects.fitness?.from_date === today,
  )?.effects.fitness;
  if (moved) lines.push(`No session — moved to ${weekday(moved.to_date)}`);
  return lines;
}

function tomorrowPreview(user: MockUser, today: string, mood?: EveningCheckInMoodKey) {
  if (mood === 'rough') return { preview: previewPayload(SMALL_LINE) };
  const yesterday = new Date(`${today}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);
  const hasFood = mockDb.foodEntries.some(
    (entry) => entry.date === today || entry.date === yesterdayDate,
  );
  return hasFood
    ? { preview: previewPayload(PUSH_LINE) }
    : { preview: null, message: 'Nothing for tomorrow.' };
}

function previewPayload(line: string) {
  return { eyebrow: 'Tomorrow, previewed', line, action: 'Good night' };
}

function ritual(user: MockUser, today: string, closed: boolean) {
  const checkIn = mockDb.eveningCheckIns[`${user.id}:${today}`];
  const answeredNotice = mockDb.checkInNotices.find(
    (notice) =>
      notice.userId === user.id &&
      notice.kind === 'evening_check_in' &&
      notice.answer !== null &&
      localToday(user, new Date(notice.due_at)) === today,
  );
  const isClosed = closed || Boolean(checkIn) || Boolean(answeredNotice);
  return {
    eyebrow: 'Evening check-in · 20 seconds',
    question: 'How did today feel?',
    moods: MOODS,
    looks_right_label: 'Looks right?',
    fix_label: 'Fix something',
    recap: recap(user, today),
    note_prompt: 'Anything for tomorrow-me?',
    close_label: 'Close the day',
    closed: isClosed,
    ...(isClosed
      ? tomorrowPreview(user, today, checkIn?.mood ?? answeredNotice?.answer ?? undefined)
      : {}),
  };
}

registerMock('GET', '/users/me/evening-check-in/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  return { status: 200, body: ritual(user, localToday(user), false) };
});

registerMock('POST', '/users/me/evening-check-in/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  if (!isRecord(request.body)) return { status: 400, body: { detail: 'Send a mood.' } };
  const mood = request.body.mood;
  if (!isMoodKey(mood)) {
    return { status: 400, body: { detail: 'Pick Rough, Meh, Okay, Good, or Great.' } };
  }
  const note = request.body.note ?? '';
  if (typeof note !== 'string' || note.length > NOTE_LIMIT) {
    return { status: 400, body: { detail: 'Keep the note short.' } };
  }
  const today = localToday(user);
  mockDb.eveningCheckIns[`${user.id}:${today}`] = { local_date: today, mood, note };
  return {
    status: 200,
    body: {
      check_in: { local_date: today, mood, closed: true },
      ...tomorrowPreview(user, today, mood),
    },
  };
});
