/**
 * Issue #55 — ways a real person can break health sync, each written as a test.
 * The tests marked `it.failing` describe a known bug that needs more than a frontend change; they
 * pass while the bug exists and must be flipped to `it` when the linked GitHub issue is fixed.
 */
import { syncWindow } from '@/features/integrations/lib/cursor';
import { mapDay, type DayRecords } from '@/features/integrations/lib/dayTotals';
import { isSyncDue } from '@/features/integrations/lib/syncThrottle';

function day(overrides: Partial<DayRecords> = {}): DayRecords {
  return {
    date: '2026-06-08',
    steps: null,
    sleepIntervals: [],
    weightsKg: [],
    hrvMillis: [],
    workouts: [],
    ...overrides,
  };
}

const at = (hour: number, minute = 0) => new Date(2026, 5, 8, hour, minute).toISOString();

describe('1. the phone clock is set backwards', () => {
  const now = Date.parse('2026-06-08T12:00:00Z');

  it('syncs on a normal schedule: due after 15 minutes, not before', () => {
    expect(isSyncDue(null, now)).toBe(true);
    expect(isSyncDue(new Date(now - 5 * 60_000).toISOString(), now)).toBe(false);
    expect(isSyncDue(new Date(now - 16 * 60_000).toISOString(), now)).toBe(true);
  });

  it('does not wait months when the last attempt looks like it is in the future', () => {
    const lastAttempt = new Date(now + 200 * 86_400_000).toISOString();
    expect(isSyncDue(lastAttempt, now)).toBe(true);
  });

  it('treats an unreadable saved time as due', () => {
    expect(isSyncDue('not-a-date', now)).toBe(true);
  });
});

describe('2. the saved sync cursor is damaged', () => {
  const today = new Date(2026, 5, 20, 12);

  it.each(['abc', '2026-13-45', '2026-02-30', '', '20260619', '2026-6-9'])(
    'a cursor of %p is ignored, so the full 30-day backfill still happens',
    (broken) => {
      const days = syncWindow({ today, syncedThrough: broken });
      expect(days).toHaveLength(31);
      expect(days[0]).toBe('2026-05-21');
    },
  );
});

describe('3. another app writes nonsense values', () => {
  it('ignores a weight of zero or less', () => {
    const log = mapDay(
      day({
        steps: 100,
        weightsKg: [
          { time: at(7), kg: 0 },
          { time: at(8), kg: -3 },
        ],
      }),
    );
    expect(log).not.toHaveProperty('weight_kg');
  });

  it('ignores a weight too small for a person (an app that wrote grams as kilograms)', () => {
    // Found on the emulator: 81.5 g stored by the Health Connect Toolbox reads back as 0.0815 kg.
    expect(
      mapDay(day({ steps: 100, weightsKg: [{ time: at(7), kg: 0.0815 }] })),
    ).not.toHaveProperty('weight_kg');
  });

  it('ignores a weight no person could have', () => {
    expect(mapDay(day({ steps: 100, weightsKg: [{ time: at(7), kg: 9000 }] }))).not.toHaveProperty(
      'weight_kg',
    );
  });

  it('uses the last plausible weight, not a later nonsense one', () => {
    const log = mapDay(
      day({
        weightsKg: [
          { time: at(7), kg: 82.4 },
          { time: at(20), kg: 0 },
        ],
      }),
    );
    expect(log?.weight_kg).toBe(82.4);
  });

  it('ignores zero or impossible HRV readings but keeps real ones in the mean', () => {
    const log = mapDay(day({ hrvMillis: [0, 40, 50, 99999] }));
    expect(log?.hrv).toBe(45);
  });

  it('ignores an impossible step count', () => {
    expect(mapDay(day({ steps: 50_000_000 }))).toBeNull();
  });

  it('keeps a very active real day', () => {
    expect(mapDay(day({ steps: 60_000 }))?.steps).toBe(60_000);
  });
});

describe('4. two apps record the same workout', () => {
  it('sends one session when a phone app and a watch app both log the same run', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Running', start: at(18, 0), end: at(18, 45) },
          { type: 'Running', start: at(18, 1), end: at(18, 44) },
        ],
      }),
    );
    expect(log?.workout_sessions).toEqual([{ type: 'Running', duration_seconds: 2700 }]);
  });

  it('keeps two different workouts on the same day', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Running', start: at(7, 0), end: at(7, 30) },
          { type: 'Strength Training', start: at(18, 0), end: at(19, 0) },
        ],
      }),
    );
    expect(log?.workout_sessions).toHaveLength(2);
  });

  it('keeps two separate runs of the same type that do not overlap', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Running', start: at(7, 0), end: at(7, 30) },
          { type: 'Running', start: at(18, 0), end: at(18, 30) },
        ],
      }),
    );
    expect(log?.workout_sessions).toHaveLength(2);
  });
});

describe('5. the person deletes a wrong entry in Health Connect', () => {
  // Known bug, GitHub issue #144 (needs a backend way to clear a field).
  // The backend ignores a missing or null field, so a corrected weight can never be cleared.
  it.failing('tells the server to forget a weight that is no longer in Health Connect', () => {
    const log = mapDay(day({ steps: 4000, weightsKg: [] }));
    expect(log).toHaveProperty('weight_kg', null);
  });
});

describe('8. the phone clock was ahead, or the person flew west, and the saved cursor is in the future', () => {
  const today = new Date(2026, 5, 8, 12);

  it('still re-reads the last two days instead of only today', () => {
    // The cursor says "synced through June 12" but it is June 8 now.
    const days = syncWindow({ today, syncedThrough: '2026-06-12' });
    expect(days).toEqual(['2026-06-06', '2026-06-07', '2026-06-08']);
  });

  it('does the same when the cursor is only one day ahead (crossing the date line)', () => {
    const days = syncWindow({ today, syncedThrough: '2026-06-09' });
    expect(days).toEqual(['2026-06-06', '2026-06-07', '2026-06-08']);
  });
});

describe('9. a sleep tracker is left running for days', () => {
  it('does not report a 24-hour night', () => {
    const log = mapDay(
      day({
        steps: 3000,
        sleepIntervals: [{ start: '2026-06-05T00:00:00.000Z', end: '2026-06-08T12:00:00.000Z' }],
      }),
    );
    expect(log?.sleep_hours).toBeUndefined();
    expect(log?.steps).toBe(3000);
  });

  it('keeps a long but possible night', () => {
    const log = mapDay(
      day({
        sleepIntervals: [{ start: '2026-06-07T12:00:00.000Z', end: '2026-06-08T10:00:00.000Z' }],
      }),
    );
    expect(log?.sleep_hours).toBe(22);
  });
});

describe('10. a workout timer is left running for days', () => {
  it('drops a session longer than a day but keeps the real one next to it', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Running', start: '2026-06-05T08:00:00.000Z', end: '2026-06-08T08:00:00.000Z' },
          { type: 'Yoga', start: at(18), end: at(19) },
        ],
      }),
    );
    expect(log?.workout_sessions).toEqual([{ type: 'Yoga', duration_seconds: 3600 }]);
  });

  it('returns nothing at all when the only session is the runaway one', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Walking', start: '2026-06-05T08:00:00.000Z', end: '2026-06-08T08:00:00.000Z' },
        ],
      }),
    );
    expect(log).toBeNull();
  });
});

describe('11. the network drops during a sync and comes back a minute later', () => {
  const now = Date.parse('2026-06-08T12:00:00.000Z');
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it('tries again soon after a failed attempt instead of waiting a quarter of an hour', () => {
    expect(isSyncDue(minutesAgo(2), now, true)).toBe(true);
  });

  it('still leaves a failed attempt alone for the first moments, so a dead server is not hammered', () => {
    expect(isSyncDue(minutesAgo(0.2), now, true)).toBe(false);
  });

  it('keeps the normal 15 minutes after a good attempt', () => {
    expect(isSyncDue(minutesAgo(2), now, false)).toBe(false);
    expect(isSyncDue(minutesAgo(16), now, false)).toBe(true);
  });
});
