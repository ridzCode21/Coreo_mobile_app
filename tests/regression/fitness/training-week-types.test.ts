/**
 * Issue #40 — Zod contract for `GET /users/me/training-week/` and
 * `POST /users/me/training-week/sets/`. Shape mirrors `training_week_payload`
 * (`apps/users/services/training_week.py:71-83`) and `mark_set`'s request body
 * (`apps/users/services/training_week.py:86-97`) field-for-field. This is a bare payload, not the
 * Style-A `{success, data}` envelope (plan.md "Backend alignment") — the schema must parse the raw
 * shape, not a wrapped one.
 */

import { markSetRequestSchema, trainingWeekResponseSchema } from '@/shared/types/trainingWeek';

const EXERCISE = {
  key: 'dumbbell_bench_press',
  name: 'Dumbbell bench press',
  sets: 4,
  reps: 8,
  weight_kg: 22.5,
  superset: null,
  completed_sets: [1, 2],
};

const SESSION = {
  key: 'push',
  name: 'Push: chest, shoulders, arms',
  weekday: 'tuesday',
  date: '2026-10-20',
  status: 'today' as const,
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 4,
  note: null,
  progression_note:
    "Bench is +2.5 kg from last week. Same lifts, heavier, that's the plan working.",
  lighter_note: null,
  exercises: [EXERCISE],
};

const FULL_PAYLOAD = {
  training_week: {
    position: { week: 3, day: 2, label: 'Week 3 · Day 2' },
    status: 'in_progress' as const,
    summary: 'Build muscle · dumbbells at home · 3 days · lower back protected',
    sessions: [SESSION],
    today: SESSION,
  },
};

describe('trainingWeek: response schema (#40)', () => {
  it('parses a full in-progress payload', () => {
    expect(() => trainingWeekResponseSchema.parse(FULL_PAYLOAD)).not.toThrow();
  });

  it('parses the incomplete-interview response ({ training_week: null }, training_week.py:44-45)', () => {
    expect(() => trainingWeekResponseSchema.parse({ training_week: null })).not.toThrow();
  });

  it('parses a rest-day payload (today: null)', () => {
    const payload = {
      training_week: { ...FULL_PAYLOAD.training_week, today: null },
    };
    expect(() => trainingWeekResponseSchema.parse(payload)).not.toThrow();
  });

  it('parses a sport session with no exercises and a note (training_week.py:242-249)', () => {
    const sportSession = {
      key: 'sport',
      name: 'Cricket counts',
      weekday: 'sunday',
      date: '2026-10-25',
      status: 'upcoming' as const,
      duration_min: null,
      gear: null,
      movement_count: 0,
      note: 'I plan around it, not against it',
      progression_note: null,
      lighter_note: null,
      exercises: [],
    };
    const payload = {
      training_week: { ...FULL_PAYLOAD.training_week, sessions: [sportSession], today: null },
    };
    expect(() => trainingWeekResponseSchema.parse(payload)).not.toThrow();
  });

  it('rejects a session with a status outside done/today/upcoming/past', () => {
    const payload = {
      training_week: {
        ...FULL_PAYLOAD.training_week,
        sessions: [{ ...SESSION, status: 'completed' }],
      },
    };
    expect(() => trainingWeekResponseSchema.parse(payload)).toThrow();
  });

  it('rejects an exercise missing completed_sets', () => {
    const { completed_sets: _omit, ...badExercise } = EXERCISE;
    const payload = {
      training_week: {
        ...FULL_PAYLOAD.training_week,
        sessions: [{ ...SESSION, exercises: [badExercise] }],
      },
    };
    expect(() => trainingWeekResponseSchema.parse(payload)).toThrow();
  });
});

describe('trainingWeek: markSetRequestSchema (#40, training_week.py:95-97)', () => {
  it('accepts a valid body', () => {
    const body = { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 1 };
    expect(() => markSetRequestSchema.parse(body)).not.toThrow();
  });

  it('rejects a non-integer set_number', () => {
    const body = { session_key: 'push', exercise_key: 'dumbbell_bench_press', set_number: 1.5 };
    expect(() => markSetRequestSchema.parse(body)).toThrow();
  });

  it('rejects a missing field', () => {
    const body = { session_key: 'push', exercise_key: 'dumbbell_bench_press' };
    expect(() => markSetRequestSchema.parse(body)).toThrow();
  });
});
