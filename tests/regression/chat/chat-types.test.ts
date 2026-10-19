/**
 * Issue #43 — the chat presence screen (18c) contract against the real backend, `POST
 * /users/me/chat/`, `/confirm/`, `/undo/` (`API_REFERENCE.md:935-999`, backend
 * `apps/users/services/chat.py:75-176`). These schemas are `.strict()` so a frontend/backend field
 * drift fails loudly here instead of silently dropping/ignoring a field at runtime.
 */

import {
  chatConfirmResponseSchema,
  chatProposeResponseSchema,
  chatReceiptSchema,
  chatUndoResponseSchema,
} from '@/shared/types/chat';

const FULL_MATCH_RECEIPTS = [
  {
    pillar: 'fitness',
    kind: 'changed',
    label: 'Fitness moved',
    summary: 'Push session → 20-min walk on your 7 PM call',
    detail: 'Session moves to Thursday. The week still adds up.',
  },
  {
    pillar: 'diet',
    kind: 'suggested',
    label: 'Dinner set',
    summary: 'Dinner before 7:30, dal, rice, sabzi',
    detail: 'Covers the protein lunch missed. Late + heavy is the 4 AM wake.',
  },
  {
    pillar: 'wellness',
    kind: 'moved_up',
    label: 'Wind-down 9:30',
    summary: 'Wind-down starts 9:30 tonight, not 9:45',
    detail: 'Days like this one are exactly when it matters.',
  },
];

describe('chatReceiptSchema (API_REFERENCE.md:948-971)', () => {
  it('accepts a real receipt from the documented example', () => {
    expect(() => chatReceiptSchema.parse(FULL_MATCH_RECEIPTS[0])).not.toThrow();
  });

  it.each(['fitness', 'diet', 'wellness'])('accepts pillar %s', (pillar) => {
    expect(() => chatReceiptSchema.parse({ ...FULL_MATCH_RECEIPTS[0], pillar })).not.toThrow();
  });

  it('rejects an unknown pillar', () => {
    expect(() => chatReceiptSchema.parse({ ...FULL_MATCH_RECEIPTS[0], pillar: 'sleep' })).toThrow();
  });

  it.each(['changed', 'suggested', 'moved_up'])('accepts kind %s', (kind) => {
    expect(() => chatReceiptSchema.parse({ ...FULL_MATCH_RECEIPTS[0], kind })).not.toThrow();
  });

  it('rejects an unknown kind', () => {
    expect(() => chatReceiptSchema.parse({ ...FULL_MATCH_RECEIPTS[0], kind: 'removed' })).toThrow();
  });

  it('rejects an unknown field (.strict())', () => {
    expect(() =>
      chatReceiptSchema.parse({ ...FULL_MATCH_RECEIPTS[0], emoji: '\u{1F3CB}' }),
    ).toThrow();
  });
});

describe('chatProposeResponseSchema (API_REFERENCE.md:938-980)', () => {
  it('accepts the full documented example verbatim', () => {
    expect(() =>
      chatProposeResponseSchema.parse({
        listening: 'Listening',
        heard: '"...skipped lunch, and I really don\'t feel like the gym."',
        line: "Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday.",
        receipts: FULL_MATCH_RECEIPTS,
        hint: 'Hold to talk · tap the bubble to type',
        proposal_id: 'a1b2c3d4-0000-4000-8000-000000000000',
        requires_confirmation: true,
      }),
    ).not.toThrow();
  });

  it('accepts the no-pillar-matched shape: empty receipts, null proposal_id, null line', () => {
    expect(() =>
      chatProposeResponseSchema.parse({
        listening: 'Listening',
        heard: 'just saying hi',
        line: null,
        receipts: [],
        hint: 'Hold to talk · tap the bubble to type',
        proposal_id: null,
        requires_confirmation: false,
      }),
    ).not.toThrow();
  });

  it('rejects a response missing requires_confirmation', () => {
    expect(() =>
      chatProposeResponseSchema.parse({
        listening: 'Listening',
        heard: 'hi',
        line: null,
        receipts: [],
        hint: 'Hold to talk · tap the bubble to type',
        proposal_id: null,
      }),
    ).toThrow();
  });

  it('rejects an unknown field (.strict())', () => {
    expect(() =>
      chatProposeResponseSchema.parse({
        listening: 'Listening',
        heard: 'hi',
        line: null,
        receipts: [],
        hint: 'Hold to talk · tap the bubble to type',
        proposal_id: null,
        requires_confirmation: false,
        confidence: 0.9,
      }),
    ).toThrow();
  });
});

describe('chatConfirmResponseSchema / chatUndoResponseSchema (API_REFERENCE.md:985-993)', () => {
  it('accepts a confirm response', () => {
    expect(() =>
      chatConfirmResponseSchema.parse({
        proposal_id: 'a1b2c3d4-0000-4000-8000-000000000000',
        applied: true,
        receipts: FULL_MATCH_RECEIPTS,
      }),
    ).not.toThrow();
  });

  it('rejects applied: false (confirm only ever returns true per the backend)', () => {
    expect(() =>
      chatConfirmResponseSchema.parse({
        proposal_id: 'a1b2c3d4-0000-4000-8000-000000000000',
        applied: false,
        receipts: [],
      }),
    ).toThrow();
  });

  it('accepts an undo response', () => {
    expect(() =>
      chatUndoResponseSchema.parse({
        proposal_id: 'a1b2c3d4-0000-4000-8000-000000000000',
        undone: true,
        receipts: FULL_MATCH_RECEIPTS,
      }),
    ).not.toThrow();
  });

  it('rejects undone: false (undo only ever returns true per the backend)', () => {
    expect(() =>
      chatUndoResponseSchema.parse({
        proposal_id: 'a1b2c3d4-0000-4000-8000-000000000000',
        undone: false,
        receipts: [],
      }),
    ).toThrow();
  });
});
