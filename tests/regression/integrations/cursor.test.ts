/**
 * Issue #55 — which local days a sync re-reads. The server replaces a whole day each time it is
 * sent (backend docs §19), so we always re-send complete days: from a couple of days before the
 * last finished sync (late-arriving watch data) through today.
 */
import {
  BACKFILL_DAYS,
  LOOKBACK_DAYS,
  MAX_WINDOW_DAYS,
  syncWindow,
} from '@/features/integrations/lib/cursor';

const today = new Date(2026, 5, 20, 15, 30); // 20 June 2026, local time

describe('syncWindow', () => {
  it('first sync reads the last 30 days, oldest first, ending today', () => {
    const days = syncWindow({ today, syncedThrough: null });
    expect(days).toHaveLength(BACKFILL_DAYS + 1);
    expect(days[0]).toBe('2026-05-21');
    expect(days[days.length - 1]).toBe('2026-06-20');
  });

  it('later syncs start LOOKBACK_DAYS before the last finished day', () => {
    const days = syncWindow({ today, syncedThrough: '2026-06-18' });
    expect(days[0]).toBe(`2026-06-${18 - LOOKBACK_DAYS}`);
    expect(days).toEqual(['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']);
  });

  it('never reads more than MAX_WINDOW_DAYS after a long gap', () => {
    const days = syncWindow({ today, syncedThrough: '2025-01-01' });
    expect(days).toHaveLength(MAX_WINDOW_DAYS + 1);
    expect(days[days.length - 1]).toBe('2026-06-20');
  });

  it('a cursor in the future still reads today', () => {
    expect(syncWindow({ today, syncedThrough: '2026-06-25' }).slice(-1)).toEqual(['2026-06-20']);
  });

  it('crosses month and year boundaries without skipping a day', () => {
    const days = syncWindow({ today: new Date(2026, 0, 2, 9), syncedThrough: '2025-12-31' });
    expect(days).toEqual(['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
  });
});
