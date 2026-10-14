/**
 * Issue #17 — home header + greeting. `timeOfDayGreeting` picks the design's "Morning"/
 * "Afternoon"/"Evening" word from the clock (no invented "Night" bucket — the design only shows
 * these three, design-spec.md 24b line 4/10-12). `formatHeaderDate` reproduces the header's
 * "Mon · Jul 7" format exactly: 3-letter weekday, " · ", 3-letter month, day with no leading zero
 * and no year (design-spec.md 24b markup, header row).
 */

import { formatHeaderDate, timeOfDayGreeting } from '@/features/home/lib/greeting';

describe('home: timeOfDayGreeting', () => {
  it('returns "Morning" before noon', () => {
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 0, 0))).toBe('Morning');
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 11, 59))).toBe('Morning');
  });

  it('returns "Afternoon" from noon up to 5pm', () => {
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 12, 0))).toBe('Afternoon');
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 16, 59))).toBe('Afternoon');
  });

  it('returns "Evening" from 5pm onward', () => {
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 17, 0))).toBe('Evening');
    expect(timeOfDayGreeting(new Date(2026, 6, 6, 23, 59))).toBe('Evening');
  });
});

describe('home: formatHeaderDate', () => {
  it('formats a Monday in July like the design\'s "Mon · Jul 7" example', () => {
    // 2026-07-06 is a real Monday (unlike the design's placeholder "Jul 7" date).
    expect(formatHeaderDate(new Date(2026, 6, 6))).toBe('Mon · Jul 6');
  });

  it('never zero-pads the day number', () => {
    expect(formatHeaderDate(new Date(2026, 6, 1))).toBe('Wed · Jul 1');
  });

  it('uses 3-letter weekday and month abbreviations for every month', () => {
    expect(formatHeaderDate(new Date(2026, 0, 15))).toBe('Thu · Jan 15');
    expect(formatHeaderDate(new Date(2026, 11, 25))).toBe('Fri · Dec 25');
  });
});
