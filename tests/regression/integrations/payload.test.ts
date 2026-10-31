/**
 * Issue #55 — the batches we post must satisfy the backend's rules (apps/integrations/serializers.py):
 * at most 366 days, no duplicate dates, no date after tomorrow, no negative numbers.
 */
import { buildBatches, BATCH_SIZE } from '@/features/integrations/lib/payload';
import type { DeviceDailyLog } from '@/features/integrations/lib/types';

const today = new Date(2026, 5, 20, 12);

function log(date: string, overrides: Partial<DeviceDailyLog> = {}): DeviceDailyLog {
  return { date, steps: 1000, workout_sessions: [], ...overrides };
}

describe('buildBatches', () => {
  it('returns one empty batch when there is nothing to send, so the first sync still connects', () => {
    expect(buildBatches([], { today })).toEqual([[]]);
  });

  it('sorts by date and keeps one row per date (the last one wins)', () => {
    const [batch] = buildBatches(
      [log('2026-06-10', { steps: 1 }), log('2026-06-09'), log('2026-06-10', { steps: 2 })],
      { today },
    );
    expect(batch.map((row) => row.date)).toEqual(['2026-06-09', '2026-06-10']);
    expect(batch[1].steps).toBe(2);
  });

  it('allows tomorrow but drops anything later', () => {
    const [batch] = buildBatches([log('2026-06-21'), log('2026-06-22')], { today });
    expect(batch.map((row) => row.date)).toEqual(['2026-06-21']);
  });

  it('drops negative and non-finite numbers instead of failing the whole batch', () => {
    const [batch] = buildBatches(
      [log('2026-06-10', { steps: -5, weight_kg: Number.NaN, sleep_hours: 7 })],
      { today },
    );
    expect(batch[0]).toEqual({ date: '2026-06-10', sleep_hours: 7, workout_sessions: [] });
  });

  it('splits long ranges into batches that stay under the 366-day limit', () => {
    const rows = Array.from({ length: BATCH_SIZE * 2 + 1 }, (_, index) => {
      const date = new Date(2026, 0, 1 + index);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return log(iso);
    });
    const batches = buildBatches(rows, { today: new Date(2027, 11, 31) });
    expect(batches).toHaveLength(3);
    expect(batches.every((batch) => batch.length <= BATCH_SIZE)).toBe(true);
    expect(BATCH_SIZE).toBeLessThanOrEqual(366);
  });
});
