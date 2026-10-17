import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';

const HEADLINES = {
  racing_mind: 'Your mind is still running. Tonight we land it.',
  sleep: 'Sleep is the heavy one. Tonight we protect it.',
  work_stress: 'Work can wait. Tonight we set it down.',
  low_energy: 'Energy is thin. Tonight we stop spending it.',
  mood_dips: 'Tonight stays small. We land it gently.',
} as const;

const WEIGHS = {
  racing_mind: 'A racing mind is what weighs.',
  sleep: 'Sleep is what weighs.',
  work_stress: 'Work stress is what weighs.',
  low_energy: 'Low energy is what weighs.',
  mood_dips: 'Mood dips are what weighs.',
} as const;

const THIRD_STEP = {
  racing_mind: 'six slow breaths in bed',
  sleep: 'six slow breaths, then lights out',
  work_stress: 'set the work down, six slow breaths in bed',
  low_energy: 'stay lying down, six slow breaths',
  mood_dips: 'six slow breaths, nothing else asked',
} as const;

const HELP_STEP = {
  chai: ['chai on the balcony, no screens', 'yours already'],
  walks: ['a walk, no screens', 'yours already'],
  music: ['music on, no screens', 'yours already'],
  prayer: ['prayer, no screens', 'yours already'],
  talking_it_out: ['talk it out, no screens', 'yours already'],
  havent_found_it: ['sit somewhere quiet, no screens', 'we start small'],
} as const;

const HELP_NAME = {
  walks: 'walks',
  music: 'music',
  chai: 'chai on the balcony',
  prayer: 'prayer',
  talking_it_out: 'talking it out',
} as const;

function localDateParts(user: MockUser, moment = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: user.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(moment);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localToday(user: MockUser): Date {
  const parts = localDateParts(user);
  return new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00.000Z`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function firstStep(note: string, morningFirst: string): readonly [string, string] {
  const hasPhone = /\bphone\b/i.test(note);
  const hasOneAm = /(?:till|until|til)\s+1\b|\b1\s*am\b|\b1am\b|\b1:00\b/i.test(note);
  if (hasPhone && hasOneAm) return ['phone goes to the kitchen', 'the 1 AM fix'];
  if (hasPhone) return ['phone goes to the kitchen', 'the phone stays out'];
  if (/\bwork\b/i.test(note)) return ['leave work outside the bedroom', 'work stays out of bed'];
  if (/wake|\b4\s*am\b/i.test(note)) {
    return ['lights down before the early wake', 'the early-wake fix'];
  }
  if (note.trim()) return ['leave the day outside the bedroom', 'from your nights'];
  if (morningFirst === 'phone') return ['phone goes to the kitchen', 'before it comes to bed'];
  return ['screens go to another room', 'a clean stop'];
}

function nightsSentence(note: string): string {
  let cleaned = note.trim().replace(/\s+/g, ' ');
  if (!cleaned) return "You didn't write a nights note.";
  if (cleaned.length > 120) cleaned = `${cleaned.slice(0, 117).trimEnd()}...`;
  return `Your nights: "${cleaned}".`;
}

function helpsSentence(helps: WellnessProfile['what_helps']): string {
  if (helps.length === 1 && helps[0] === 'havent_found_it') {
    return 'Nothing helps yet, so tonight stays small.';
  }
  const names = helps.map((help) => HELP_NAME[help as keyof typeof HELP_NAME]);
  const joined =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  const capitalized = `${joined.charAt(0).toUpperCase()}${joined.slice(1)}`;
  return `${capitalized} already ${names.length === 1 ? 'helps' : 'help'}.`;
}

function hasTwoShortNights(userId: string, today: Date): boolean {
  return [-2, -1].every((offset) => {
    const hours = mockDb.dailyLogs[`${userId}:${isoDate(addDays(today, offset))}`]?.sleep_hours;
    return hours !== null && hours !== undefined && hours < 6;
  });
}

function tomorrowIsPush(userId: string, today: Date): boolean {
  const fitness = mockDb.fitnessProfiles[userId];
  if (!fitness?.fitness_interview_complete) return false;
  const tomorrow = addDays(today, 1);
  if ((tomorrow.getUTCDay() || 7) !== 2) return false;
  const block = mockDb.trainingBlocks[userId];
  return !block || isoDate(tomorrow) >= block.started_on;
}

registerMock('GET', '/users/me/wind-down/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }
  const profile = mockDb.wellnessProfiles[user.id];
  if (!profile?.wellness_interview_complete) {
    return { status: 200, body: { wind_down: null } };
  }

  const focus = profile.wellness_focus as keyof typeof HEADLINES;
  const helps = profile.what_helps;
  const first = firstStep(profile.nights_note, profile.morning_first);
  const preferredHelp = helps.includes('chai') ? 'chai' : helps[0];
  const second = HELP_STEP[preferredHelp];
  const today = localToday(user);
  const stakes = hasTwoShortNights(user.id, today) && tomorrowIsPush(user.id, today);
  const moment = localDateParts(user);
  const windDown = {
    clock: `${moment.hour}:${moment.minute} ${moment.dayPeriod}`,
    headline: stakes ? 'Your day ran hot. Tonight we land it early.' : HEADLINES[focus],
    title: "Tonight's wind-down",
    lights_out: '10:45',
    steps: [
      { time: '9:45', text: first[0], reason: first[1] },
      { time: '10:00', text: second[0], reason: second[1] },
      { time: '10:30', text: THIRD_STEP[focus], reason: '2 min, guided' },
    ],
    line: 'One routine, built from your interview. No library to scroll.',
    reason: stakes
      ? 'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.'
      : `${WEIGHS[focus]} ${nightsSentence(profile.nights_note)} ${helpsSentence(helps)}`,
    ...(profile.hide_numbers
      ? {
          plain_words:
            'You asked for plain words, no scores here. The graphs exist if you ever want them.',
        }
      : {}),
    pushed: false,
  };
  return { status: 200, body: { wind_down: windDown } };
});
