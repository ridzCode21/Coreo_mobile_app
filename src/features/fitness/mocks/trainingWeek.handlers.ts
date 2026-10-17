import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleB } from '@/shared/api/mock/envelope';
import { registerMock, type MockResponse } from '@/shared/api/mock/router';
import { type FitnessProfile, type ProtectedArea } from '@/shared/types/fitnessProfile';
import type {
  TrainingWeekExercise,
  TrainingWeekResponse,
  TrainingWeekSession,
} from '@/shared/types/trainingWeek';

import {
  GOALS,
  LIFT_DAYS,
  SPORT_WEEKDAY,
  applySwap,
  firstSport,
  liftName,
  movements,
  protectedClause,
  resolvePlace,
} from '@/features/fitness/lib/trainingLibrary';

const FULL_MINUTES = 45;
const SHORT_MINUTES = 35;
const WEEKLY_KILOS = 2.5;
const SHORT_SLEEP_HOURS = 6;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoWeekday(date: Date): number {
  return date.getUTCDay() || 7;
}

function mondayOf(date: Date): Date {
  return addDays(date, 1 - isoWeekday(date));
}

function localToday(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now()));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return parseDate(`${value.year}-${value.month}-${value.day}`);
}

function completedSets(userId: string, sessionDate: string, exerciseKey: string): number[] {
  return mockDb.completedSets
    .filter(
      (row) =>
        row.userId === userId && row.sessionDate === sessionDate && row.exerciseKey === exerciseKey,
    )
    .map((row) => row.setNumber)
    .sort((left, right) => left - right);
}

function sessionStatus(
  sessionDate: string,
  today: string,
  exercises: TrainingWeekExercise[],
): TrainingWeekSession['status'] {
  const done =
    exercises.length > 0 &&
    exercises.every((exercise) =>
      Array.from({ length: exercise.sets }, (_, index) => index + 1).every((set) =>
        exercise.completed_sets.includes(set),
      ),
    );
  if (done) return 'done';
  if (sessionDate === today) return 'today';
  return sessionDate > today ? 'upcoming' : 'past';
}

function weekNumber(startedOn: string, today: Date): number {
  const anchor = mondayOf(parseDate(startedOn));
  return Math.max(1, Math.floor((today.getTime() - anchor.getTime()) / 604_800_000) + 1);
}

function fitnessInterviewComplete(profile: { fitness_interview_complete: boolean } | undefined) {
  return Boolean(profile?.fitness_interview_complete);
}

function lighterNote(shortSleep: boolean, sportYesterday: boolean, sportName: string | null) {
  const ending = "I trimmed a set from each lift, you'll still progress.";
  if (shortSleep && sportYesterday) {
    return `Short sleep last night and ${sportName?.toLowerCase()} yesterday. ${ending}`;
  }
  if (shortSleep) return `Short sleep last night. ${ending}`;
  if (sportYesterday) return `${sportName} yesterday. ${ending}`;
  return null;
}

function liftSession(args: {
  userId: string;
  key: 'legs' | 'push' | 'pull';
  label: string;
  sessionDate: string;
  today: string;
  week: number;
  profile: FitnessProfile;
  areas: ProtectedArea[];
  sportKey: string | null;
  sportName: string | null;
}): TrainingWeekSession {
  const place = resolvePlace(args.profile.training_places);
  const previousDate = isoDate(addDays(parseDate(args.sessionDate), -1));
  const previousLog = mockDb.dailyLogs[`${args.userId}:${previousDate}`];
  const shortSleep =
    args.sessionDate <= args.today &&
    previousLog?.sleep_hours !== null &&
    previousLog?.sleep_hours !== undefined &&
    previousLog.sleep_hours < SHORT_SLEEP_HOURS;
  const sportYesterday =
    args.sessionDate <= args.today &&
    Boolean(args.sportKey) &&
    isoWeekday(parseDate(previousDate)) === SPORT_WEEKDAY;
  const shortened = shortSleep || sportYesterday;
  const withInternalFields = movements(args.key, place.library).map((source) => {
    const exercise = applySwap(source, args.areas);
    const sets = shortened ? Math.max(1, exercise.sets - 1) : exercise.sets;
    return {
      ...exercise,
      sets,
      reps: args.profile.fitness_goal === 'get_stronger' ? 5 : exercise.reps,
      weight_kg:
        exercise.weight_kg === null ? null : exercise.weight_kg + WEEKLY_KILOS * (args.week - 1),
      completed_sets: completedSets(args.userId, args.sessionDate, exercise.key).filter(
        (set) => set <= sets,
      ),
    };
  });
  const progressionWord = withInternalFields.find(
    (exercise) => exercise.weight_kg !== null && exercise.progression,
  )?.progression;
  const exercises: TrainingWeekExercise[] = withInternalFields.map(
    ({ progression: _progression, ...exercise }) => exercise,
  );
  const progressionNote =
    args.week >= 2 && progressionWord
      ? `${progressionWord} is +2.5 kg from last week. Same lifts, heavier, that's the plan working.`
      : null;

  return {
    key: args.key,
    name: liftName(args.key, args.areas),
    weekday: args.label,
    date: args.sessionDate,
    status: sessionStatus(args.sessionDate, args.today, exercises),
    duration_min: shortened ? SHORT_MINUTES : FULL_MINUTES,
    gear: place.gear,
    movement_count: exercises.length,
    note: null,
    progression_note: progressionNote,
    lighter_note: lighterNote(shortSleep, sportYesterday, args.sportName),
    exercises,
  };
}

function buildTrainingWeek(user: MockUser, profile: FitnessProfile): TrainingWeekResponse {
  const todayDate = localToday(user.timezone);
  const today = isoDate(todayDate);
  const block = mockDb.trainingBlocks[user.id] ?? { started_on: today };
  mockDb.trainingBlocks[user.id] = block;
  const week = weekNumber(block.started_on, todayDate);
  const monday = mondayOf(todayDate);
  const areas = profile.protected_areas;
  const [sportKey, sportName] = firstSport(profile.sports);

  const sessions: TrainingWeekSession[] = LIFT_DAYS.map((day) => ({
    day,
    date: isoDate(addDays(monday, day.weekday - 1)),
  }))
    .filter(({ date }) => date >= block.started_on)
    .map(({ day, date }) =>
      liftSession({
        userId: user.id,
        key: day.key,
        label: day.label,
        sessionDate: date,
        today,
        week,
        profile,
        areas,
        sportKey,
        sportName,
      }),
    );

  if (sportKey && sportName) {
    const sportDate = isoDate(addDays(monday, SPORT_WEEKDAY - 1));
    if (sportDate >= block.started_on) {
      sessions.push({
        key: 'sport',
        name: `${sportName} counts`,
        weekday: 'sunday',
        date: sportDate,
        status: sessionStatus(sportDate, today, []),
        duration_min: null,
        gear: null,
        movement_count: 0,
        note: 'I plan around it, not against it',
        progression_note: null,
        lighter_note: null,
        exercises: [],
      });
    }
  }

  const place = resolvePlace(profile.training_places);
  const clause = protectedClause(areas);
  const summary = [GOALS[profile.fitness_goal || 'build_muscle'], place.summary, '3 days', clause]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
  const liftSessions = sessions.filter((session) => !['sport', 'walk'].includes(session.key));

  return {
    training_week: {
      position: {
        week,
        day: isoWeekday(todayDate),
        label: `Week ${week} · Day ${isoWeekday(todayDate)}`,
      },
      status:
        liftSessions.length > 0 && liftSessions.every((session) => session.status === 'done')
          ? 'complete'
          : 'in_progress',
      summary,
      sessions,
      today: sessions.find((session) => session.date === today) ?? null,
    },
  };
}

function badRequest(detail: string): MockResponse {
  return { status: 400, body: styleB({ detail }) };
}

registerMock('GET', '/users/me/training-week/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return {
      status: 401,
      body: styleB({ detail: 'Authentication credentials were not provided.' }),
    };
  }
  const storedProfile = mockDb.fitnessProfiles[user.id];
  if (!fitnessInterviewComplete(storedProfile)) {
    return { status: 200, body: styleB({ training_week: null }) };
  }
  return { status: 200, delayMs: 250, body: styleB(buildTrainingWeek(user, storedProfile)) };
});

registerMock('POST', '/users/me/training-week/sets/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return {
      status: 401,
      body: styleB({ detail: 'Authentication credentials were not provided.' }),
    };
  }
  const body = request.body;
  if (
    typeof body !== 'object' ||
    body === null ||
    !('session_key' in body) ||
    !('exercise_key' in body) ||
    !('set_number' in body)
  ) {
    return badRequest('Send session_key, exercise_key, and set_number.');
  }
  const storedProfile = mockDb.fitnessProfiles[user.id];
  if (!fitnessInterviewComplete(storedProfile)) {
    return badRequest('Finish the fitness interview before training.');
  }
  const payload = buildTrainingWeek(user, storedProfile);
  const sessionKey = body.session_key;
  const exerciseKey = body.exercise_key;
  const setNumber = body.set_number;
  const session = payload.training_week?.sessions.find((item) => item.key === sessionKey);
  if (!session || typeof sessionKey !== 'string') {
    return badRequest('That session is not in this week.');
  }
  if (session.key === 'sport') return badRequest('That session has no sets.');
  if (session.status === 'upcoming') return badRequest('That session is still ahead.');
  if (typeof exerciseKey !== 'string') {
    return badRequest('That exercise is not in this session.');
  }
  const exercise = session.exercises.find((item) => item.key === exerciseKey);
  if (!exercise) return badRequest('That exercise is not in this session.');
  if (
    typeof setNumber !== 'number' ||
    !Number.isInteger(setNumber) ||
    setNumber < 1 ||
    setNumber > exercise.sets
  ) {
    return badRequest('That set is not in this session.');
  }

  const exists = mockDb.completedSets.some(
    (row) =>
      row.userId === user.id &&
      row.sessionDate === session.date &&
      row.exerciseKey === exerciseKey &&
      row.setNumber === setNumber,
  );
  if (!exists) {
    mockDb.completedSets.push({
      userId: user.id,
      sessionDate: session.date,
      exerciseKey,
      setNumber,
    });
  }
  return { status: 200, body: styleB(buildTrainingWeek(user, storedProfile)) };
});
