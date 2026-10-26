/**
 * Issue #32 — the backend's `scheduled_time` field (`apps/meals/models.py:124`,
 * serialized as a 24-hour `HH:MM` string or `null` in `apps/meals/views.py:808`, documented in
 * API_REFERENCE.md around line 1981) is real and nullable per meal. The design (29a/29b,
 * design-spec.md lines 7 and 101) shows a meal's row/header label as
 * "{MealType} · {h:mm}" (no leading zero on the hour) when a time is known, and the bare
 * "{MealType}" when it is not. These are the pure formatting rules both screens must share.
 */
import { formatMealTime, mealTimeLabel } from '@/features/nutrition/lib/mealClock';

describe('formatMealTime', () => {
  it('strips a leading zero from the hour but keeps the zero-padded minute', () => {
    expect(formatMealTime('07:40')).toBe('7:40');
  });

  it('leaves a two-digit hour untouched', () => {
    expect(formatMealTime('12:30')).toBe('12:30');
  });

  it('keeps a zero-padded minute intact', () => {
    expect(formatMealTime('19:05')).toBe('19:05');
  });
});

describe('mealTimeLabel', () => {
  it('appends the formatted time after the meal label when scheduled_time is set', () => {
    expect(mealTimeLabel('lunch', '12:30')).toBe('Lunch · 12:30');
  });

  it('returns the bare meal label when scheduled_time is null', () => {
    expect(mealTimeLabel('breakfast', null)).toBe('Breakfast');
  });

  it('returns the bare meal label when scheduled_time is undefined (field omitted)', () => {
    expect(mealTimeLabel('snack', undefined)).toBe('Snack');
  });
});
