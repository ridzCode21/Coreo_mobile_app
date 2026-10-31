/**
 * Issue #55 — turn one local day of Health Connect records into one `daily_logs` row for
 * `POST /insights/import/`. Units are the backend's: kg, hours, seconds, HRV in milliseconds.
 */
import { mapDay, type DayRecords } from '@/features/integrations/lib/dayTotals';
import { titleCaseConstant } from '@/features/integrations/lib/exerciseName';

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

describe('mapDay', () => {
  it('returns null for a day with nothing in it, so no empty rows are written', () => {
    expect(mapDay(day())).toBeNull();
    expect(mapDay(day({ steps: 0 }))).toBeNull();
  });

  it('rounds steps and keeps the date', () => {
    expect(mapDay(day({ steps: 8400.4 }))).toEqual({
      date: '2026-06-08',
      steps: 8400,
      workout_sessions: [],
    });
  });

  it('adds up sleep intervals as hours', () => {
    const log = mapDay(
      day({
        sleepIntervals: [
          { start: '2026-06-07T22:30:00.000Z', end: '2026-06-08T02:30:00.000Z' },
          { start: '2026-06-08T03:00:00.000Z', end: '2026-06-08T06:30:00.000Z' },
        ],
      }),
    );
    expect(log?.sleep_hours).toBe(7.5);
  });

  it('does not count overlapping intervals twice (two apps recording the same night)', () => {
    const log = mapDay(
      day({
        sleepIntervals: [
          { start: '2026-06-07T23:00:00.000Z', end: '2026-06-08T05:00:00.000Z' },
          { start: '2026-06-08T01:00:00.000Z', end: '2026-06-08T07:00:00.000Z' },
        ],
      }),
    );
    expect(log?.sleep_hours).toBe(8);
  });

  it('drops a night longer than 24 hours: nobody sleeps that long, it is a tracker left running', () => {
    const log = mapDay(
      day({
        steps: 1000,
        sleepIntervals: [{ start: '2026-06-07T00:00:00.000Z', end: '2026-06-09T12:00:00.000Z' }],
      }),
    );
    expect(log?.sleep_hours).toBeUndefined();
  });

  it('uses the last weight of the day and the mean HRV', () => {
    const log = mapDay(
      day({
        weightsKg: [
          { time: '2026-06-08T07:00:00.000Z', kg: 82.6 },
          { time: '2026-06-08T20:00:00.000Z', kg: 82.1 },
          { time: '2026-06-08T12:00:00.000Z', kg: 82.4 },
        ],
        hrvMillis: [40, 50, 45],
      }),
    );
    expect(log?.weight_kg).toBe(82.1);
    expect(log?.hrv).toBe(45);
  });

  it('maps workouts to type and whole seconds, dropping zero-length ones', () => {
    const log = mapDay(
      day({
        workouts: [
          { type: 'Running', start: '2026-06-08T06:00:00.000Z', end: '2026-06-08T06:45:00.000Z' },
          { type: 'Walking', start: '2026-06-08T09:00:00.000Z', end: '2026-06-08T09:00:00.000Z' },
        ],
      }),
    );
    expect(log?.workout_sessions).toEqual([{ type: 'Running', duration_seconds: 2700 }]);
  });

  it('leaves out fields it has no data for', () => {
    const log = mapDay(day({ steps: 100 }));
    expect(log).not.toHaveProperty('weight_kg');
    expect(log).not.toHaveProperty('hrv');
    expect(log).not.toHaveProperty('sleep_hours');
  });
});

describe('titleCaseConstant', () => {
  it('turns a Health Connect constant name into a readable workout type', () => {
    expect(titleCaseConstant('RUNNING')).toBe('Running');
    expect(titleCaseConstant('STRENGTH_TRAINING')).toBe('Strength Training');
  });
});
