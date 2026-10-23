/**
 * Issue #47 — what a tap on the lock-screen nudge means. The server accepts only `good` or `rough`
 * as an answer (`answer_check_in_notice`: anything else is `action_invalid`), so Open and a tap on
 * the banner must never become an answer.
 */

import {
  EVENING_CHECK_IN_ACTIONS,
  EVENING_CHECK_IN_CATEGORY,
  answerForAction,
  decideNoticeResponse,
} from '@/features/notifications/lib/checkInNotice';

const NOTICE_ID = '3f2b8c1e-5a47-4d9e-8a6b-0c1d2e3f4a5b';
const eveningData = { id: NOTICE_ID, kind: 'evening_check_in', title: 'Evening check-in' };

describe('notifications: category definition (design 27c)', () => {
  it('uses the category id the server sends for the evening check-in', () => {
    expect(EVENING_CHECK_IN_CATEGORY).toBe('evening_check_in');
  });

  it('lists Good, Rough and Open in that order, only Open bringing the app forward', () => {
    expect(EVENING_CHECK_IN_ACTIONS.map((a) => [a.identifier, a.buttonTitle])).toEqual([
      ['good', 'Good'],
      ['rough', 'Rough'],
      ['open', 'Open'],
    ]);
    expect(EVENING_CHECK_IN_ACTIONS.map((a) => a.opensAppToForeground)).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe('notifications: answerForAction', () => {
  it('maps good and rough, and nothing else', () => {
    expect(answerForAction('good')).toBe('good');
    expect(answerForAction('rough')).toBe('rough');
    expect(answerForAction('open')).toBeNull();
    expect(answerForAction('expo.modules.notifications.actions.DEFAULT')).toBeNull();
    expect(answerForAction('GOOD')).toBeNull();
  });
});

describe('notifications: decideNoticeResponse', () => {
  const base = { data: eveningData, responseKey: 'n1:good' };

  it('sends Good and Rough for an evening check-in', () => {
    expect(decideNoticeResponse({ ...base, actionIdentifier: 'good' })).toEqual({
      type: 'answer',
      noticeId: NOTICE_ID,
      answer: 'good',
      responseKey: 'n1:good',
    });
    expect(decideNoticeResponse({ ...base, actionIdentifier: 'rough' })).toMatchObject({
      type: 'answer',
      answer: 'rough',
    });
  });

  it('never sends an answer for Open or a tap on the banner', () => {
    expect(decideNoticeResponse({ ...base, actionIdentifier: 'open' })).toEqual({ type: 'open' });
    expect(
      decideNoticeResponse({
        ...base,
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      }),
    ).toEqual({ type: 'open' });
  });

  it.each([
    ['no data', undefined],
    ['null data', null],
    ['no id', { kind: 'evening_check_in' }],
    ['an id that is not a uuid', { id: 'abc', kind: 'evening_check_in' }],
    ['an id that is a number', { id: 7, kind: 'evening_check_in' }],
  ])('treats a Good tap with %s as unreadable and sends nothing', (_label, data) => {
    expect(decideNoticeResponse({ ...base, data, actionIdentifier: 'good' })).toEqual({
      type: 'unreadable',
    });
  });

  it('does not answer a late-night guard notice (the server refuses it)', () => {
    expect(
      decideNoticeResponse({
        ...base,
        data: { id: NOTICE_ID, kind: 'late_night_guard' },
        actionIdentifier: 'good',
      }),
    ).toEqual({ type: 'open' });
  });
});
