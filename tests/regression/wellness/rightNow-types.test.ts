/**
 * Issue #42 — Zod contract for `GET /users/me/right-now/`. Shape mirrors `right_now_payload`
 * (`apps/users/services/right_now.py:20-35`) field-for-field. Bare payload, not the Style-A
 * envelope. `heart_rate` is accepted by the schema (the backend can send it, `right_now.py:33-34`)
 * but plan.md Decision 6 is explicit: the UI must never render it regardless.
 */

import { rightNowResponseSchema } from '@/shared/types/rightNow';

const FULL_BREATH = {
  eyebrow: 'Right now',
  headline: "Your heart's been running for twenty minutes. Let's slow it together.",
  cue: 'Breathe out',
  pattern: 'In for 4 · hold for 7 · out for 8',
  line: 'Nothing to pick. Just this, six times.',
  not_now: 'Not now',
  im_here: "I'm here",
};

describe('rightNow: response schema (#42)', () => {
  it('parses { breath: null, message: "Nothing to do." } (right_now.py:22-23)', () => {
    expect(() =>
      rightNowResponseSchema.parse({ breath: null, message: 'Nothing to do.' }),
    ).not.toThrow();
  });

  it('parses { breath: null } with no message key', () => {
    expect(() => rightNowResponseSchema.parse({ breath: null })).not.toThrow();
  });

  it('parses a full breath without heart_rate (hide_numbers true, right_now.py:33-34)', () => {
    expect(() => rightNowResponseSchema.parse({ breath: FULL_BREATH })).not.toThrow();
  });

  it('parses a full breath with heart_rate present (hide_numbers false)', () => {
    const payload = { breath: { ...FULL_BREATH, heart_rate: 142 } };
    expect(() => rightNowResponseSchema.parse(payload)).not.toThrow();
  });

  it('rejects a breath missing im_here', () => {
    const { im_here: _omit, ...bad } = FULL_BREATH;
    expect(() => rightNowResponseSchema.parse({ breath: bad })).toThrow();
  });

  it('rejects heart_rate as a non-number', () => {
    const payload = { breath: { ...FULL_BREATH, heart_rate: '142' } };
    expect(() => rightNowResponseSchema.parse(payload)).toThrow();
  });
});
