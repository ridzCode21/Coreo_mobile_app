/**
 * Issue #42 — Zod contract for `GET /users/me/wind-down/`. Shape mirrors `wind_down_payload`
 * (`apps/users/services/wind_down.py:72-110`) field-for-field. Bare payload, not the Style-A
 * `{success, data}` envelope (plan.md "Backend alignment").
 */

import { windDownResponseSchema } from '@/shared/types/windDown';

const STEP = { time: '9:45', text: 'phone goes to the kitchen', reason: 'the 1 AM fix' };

const FULL_WIND_DOWN = {
  clock: '9:12 PM',
  headline: 'Your day ran hot. Tonight we land it early.',
  title: "Tonight's wind-down",
  lights_out: '10:45',
  steps: [
    STEP,
    { time: '10:00', text: 'chai on the balcony, no screens', reason: 'yours already' },
    { time: '10:30', text: 'six slow breaths in bed', reason: '2 min, guided' },
  ],
  line: 'One routine, built from your interview. No library to scroll.',
  reason: 'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
  pushed: false,
};

describe('windDown: response schema (#42)', () => {
  it('parses a full payload without plain_words', () => {
    expect(() => windDownResponseSchema.parse({ wind_down: FULL_WIND_DOWN })).not.toThrow();
  });

  it('parses a payload with plain_words present (wind_down.py:102-103)', () => {
    const payload = {
      wind_down: {
        ...FULL_WIND_DOWN,
        plain_words:
          'You asked for plain words, no scores here. The graphs exist if you ever want them.',
      },
    };
    expect(() => windDownResponseSchema.parse(payload)).not.toThrow();
  });

  it('parses { wind_down: null } (incomplete wellness interview, wind_down.py:73-74)', () => {
    expect(() => windDownResponseSchema.parse({ wind_down: null })).not.toThrow();
  });

  it('rejects a payload missing steps', () => {
    const { steps: _omit, ...bad } = FULL_WIND_DOWN;
    expect(() => windDownResponseSchema.parse({ wind_down: bad })).toThrow();
  });

  it('rejects a step missing reason', () => {
    const { reason: _omit, ...badStep } = STEP;
    const payload = { wind_down: { ...FULL_WIND_DOWN, steps: [badStep] } };
    expect(() => windDownResponseSchema.parse(payload)).toThrow();
  });

  it('rejects an unknown top-level key (no wrapper other than wind_down)', () => {
    expect(() =>
      windDownResponseSchema.parse({ wind_down: FULL_WIND_DOWN, success: true }),
    ).toThrow();
  });

  it('rejects pushed as a non-boolean', () => {
    const payload = { wind_down: { ...FULL_WIND_DOWN, pushed: 'false' } };
    expect(() => windDownResponseSchema.parse(payload)).toThrow();
  });
});
