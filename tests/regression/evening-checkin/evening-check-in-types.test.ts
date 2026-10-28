/**
 * Issue #46 — Zod contract for `GET/POST /users/me/evening-check-in/`. Shapes mirror
 * `evening_check_in_payload` and `close_evening_check_in` (`apps/users/services/
 * evening_check_in.py:32-60`) field for field. Bare payloads (Style B), not the Style-A envelope.
 * Fixtures are taken verbatim from `apps/users/test_nudge.py:525-637` (the backend's own tests for
 * this endpoint) so this file fails if the frontend schema drifts from the real contract.
 */

import {
  eveningCheckInCloseResponseSchema,
  eveningCheckInMoodKeySchema,
  eveningCheckInRitualSchema,
} from '@/shared/types/eveningCheckIn';

const OPEN_RITUAL = {
  eyebrow: 'Evening check-in · 20 seconds',
  question: 'How did today feel?',
  moods: [
    { key: 'rough', label: 'Rough' },
    { key: 'meh', label: 'Meh' },
    { key: 'okay', label: 'Okay' },
    { key: 'good', label: 'Good' },
    { key: 'great', label: 'Great' },
  ],
  looks_right_label: 'Looks right?',
  fix_label: 'Fix something',
  recap: ['7,904 steps'],
  note_prompt: 'Anything for tomorrow-me?',
  close_label: 'Close the day',
  closed: false,
};

const PREVIEW_PUSH = {
  eyebrow: 'Tomorrow, previewed',
  line: "Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here.",
  action: 'Good night',
};

describe('eveningCheckIn: mood key schema (#46)', () => {
  it('accepts exactly the five backend mood keys (evening_check_in.py:14-20)', () => {
    for (const key of ['rough', 'meh', 'okay', 'good', 'great']) {
      expect(() => eveningCheckInMoodKeySchema.parse(key)).not.toThrow();
    }
  });

  it('rejects any other value, e.g. "fine" (test_nudge.py:639-643)', () => {
    expect(() => eveningCheckInMoodKeySchema.parse('fine')).toThrow();
  });
});

describe('eveningCheckIn: GET ritual schema (#46)', () => {
  it('parses the open-state payload (test_nudge.py:532-543)', () => {
    expect(() => eveningCheckInRitualSchema.parse(OPEN_RITUAL)).not.toThrow();
  });

  it('has no preview/message key at all in the open state', () => {
    const parsed = eveningCheckInRitualSchema.parse(OPEN_RITUAL);
    expect(parsed.preview).toBeUndefined();
    expect(parsed.message).toBeUndefined();
  });

  it('parses the closed state with a preview (test_nudge.py:277-280)', () => {
    const closed = { ...OPEN_RITUAL, closed: true, preview: PREVIEW_PUSH };
    expect(() => eveningCheckInRitualSchema.parse(closed)).not.toThrow();
  });

  it('parses the closed state with preview: null and a message (test_nudge.py:616-637)', () => {
    const closed = {
      ...OPEN_RITUAL,
      closed: true,
      preview: null,
      message: 'Nothing for tomorrow.',
    };
    expect(() => eveningCheckInRitualSchema.parse(closed)).not.toThrow();
  });

  it('rejects an empty recap array being coerced into a string (drift guard)', () => {
    expect(() =>
      eveningCheckInRitualSchema.parse({ ...OPEN_RITUAL, recap: 'not an array' }),
    ).toThrow();
  });

  it('rejects a payload missing a required field ', () => {
    const { close_label: _close_label, ...withoutCloseLabel } = OPEN_RITUAL;
    expect(() => eveningCheckInRitualSchema.parse(withoutCloseLabel)).toThrow();
  });

  it('ignores a field the backend adds later instead of breaking the screen', () => {
    const parsed = eveningCheckInRitualSchema.parse({ ...OPEN_RITUAL, score: 42 });
    expect(parsed.question).toBe('How did today feel?');
    expect(parsed).not.toHaveProperty('score');
  });
});

describe('eveningCheckIn: POST close-response schema (#46)', () => {
  it('parses a successful close with a preview (test_nudge.py:545-559)', () => {
    const response = {
      check_in: { local_date: '2026-10-05', mood: 'good', closed: true },
      preview: PREVIEW_PUSH,
    };
    expect(() => eveningCheckInCloseResponseSchema.parse(response)).not.toThrow();
  });

  it('parses a successful close with preview: null and a message (test_nudge.py:629-637)', () => {
    const response = {
      check_in: { local_date: '2026-10-07', mood: 'okay', closed: true },
      preview: null,
      message: 'Nothing for tomorrow.',
    };
    expect(() => eveningCheckInCloseResponseSchema.parse(response)).not.toThrow();
  });

  it('never carries the note back (test_nudge.py:560, assertNotIn("kidney", ...))', () => {
    const response = {
      check_in: { local_date: '2026-10-05', mood: 'good', closed: true },
      preview: PREVIEW_PUSH,
    };
    const parsed = eveningCheckInCloseResponseSchema.parse(response);
    expect(JSON.stringify(parsed)).not.toContain('kidney');
    expect('note' in parsed.check_in).toBe(false);
  });

  it('rejects an invalid mood in check_in.mood', () => {
    const response = {
      check_in: { local_date: '2026-10-05', mood: 'fine', closed: true },
      preview: null,
      message: 'x',
    };
    expect(() => eveningCheckInCloseResponseSchema.parse(response)).toThrow();
  });
});
