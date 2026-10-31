/** Issue #55 — splitting a window of Health Connect records into local days. */
import { bucketRecords, type WindowRecords } from '@/features/integrations/lib/bucketRecords';

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 5, day, hour, minute).toISOString();

function window(overrides: Partial<WindowRecords> = {}): WindowRecords {
  return { stepsByDate: {}, sleepSessions: [], weights: [], hrv: [], workouts: [], ...overrides };
}

describe('bucketRecords', () => {
  it('returns one entry per requested day, in order, even when empty', () => {
    const days = bucketRecords(['2026-06-08', '2026-06-09'], window());
    expect(days.map((day) => day.date)).toEqual(['2026-06-08', '2026-06-09']);
    expect(days[0].steps).toBeNull();
  });

  it('puts a night on the day you woke up', () => {
    const night = {
      start: at(7, 23),
      end: at(8, 7),
      asleep: [{ start: at(7, 23), end: at(8, 7) }],
    };
    const [seventh, eighth] = bucketRecords(
      ['2026-06-07', '2026-06-08'],
      window({ sleepSessions: [night] }),
    );
    expect(seventh.sleepIntervals).toEqual([]);
    expect(eighth.sleepIntervals).toEqual(night.asleep);
  });

  it('puts a workout on the day it started, not the day it ended', () => {
    const lateRun = { type: 'Running', start: at(8, 23, 30), end: at(9, 0, 30) };
    const [eighth, ninth] = bucketRecords(
      ['2026-06-08', '2026-06-09'],
      window({ workouts: [lateRun] }),
    );
    expect(eighth.workouts).toEqual([lateRun]);
    expect(ninth.workouts).toEqual([]);
  });

  it('keeps steps, weight and HRV on their own day and ignores days outside the window', () => {
    const days = bucketRecords(
      ['2026-06-08'],
      window({
        stepsByDate: { '2026-06-08': 9000 },
        weights: [
          { time: at(8, 7), kg: 82 },
          { time: at(20, 7), kg: 90 },
        ],
        hrv: [
          { time: at(8, 6), millis: 44 },
          { time: at(1, 6), millis: 99 },
        ],
      }),
    );
    expect(days).toHaveLength(1);
    expect(days[0].steps).toBe(9000);
    expect(days[0].weightsKg).toEqual([{ time: at(8, 7), kg: 82 }]);
    expect(days[0].hrvMillis).toEqual([44]);
  });
});
