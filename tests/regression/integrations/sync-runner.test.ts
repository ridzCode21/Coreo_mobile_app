/**
 * Issue #55 — one sync end to end with a fake health store and a fake API: which days are read,
 * what is sent, and when the "synced through" cursor moves.
 */
import { runSync } from '@/features/integrations/lib/syncRunner';
import type { DayRecords } from '@/features/integrations/lib/dayTotals';
import type { HealthSourceClient } from '@/features/integrations/lib/healthSourceClient';

const today = new Date(2026, 5, 20, 12);

function records(date: string, steps: number | null): DayRecords {
  return { date, steps, sleepIntervals: [], weightsKg: [], hrvMillis: [], workouts: [] };
}

function fakeClient(rows: (date: string) => DayRecords): HealthSourceClient {
  return {
    source: 'health_connect',
    getAvailability: async () => 'available',
    hasPermission: async () => true,
    requestPermission: async () => true,
    readDays: jest.fn(async (dates: string[]) => dates.map(rows)),
    openSettings: jest.fn(),
  };
}

const accepted = {
  success: true as const,
  source: 'health_connect' as const,
  days_written: 0,
  last_synced_at: '2026-06-20T12:00:00Z',
  synced_through: null,
};

describe('runSync', () => {
  it('first sync reads 30 days back and sends only days that have data', async () => {
    const client = fakeClient((date) => records(date, date === '2026-06-19' ? 5000 : null));
    const importBatch = jest.fn(async () => accepted);
    const onFinished = jest.fn();

    const result = await runSync({ client, importBatch, syncedThrough: null, today, onFinished });

    expect((client.readDays as jest.Mock).mock.calls[0][0]).toHaveLength(31);
    expect(importBatch).toHaveBeenCalledTimes(1);
    expect(importBatch).toHaveBeenCalledWith({
      source: 'health_connect',
      daily_logs: [{ date: '2026-06-19', steps: 5000, workout_sessions: [] }],
    });
    expect(onFinished).toHaveBeenCalledWith('2026-06-20');
    expect(result).toEqual({ daysSent: 1, syncedThrough: '2026-06-20' });
  });

  it('with no data at all it still sends one empty batch, which is what connects the source', async () => {
    const client = fakeClient((date) => records(date, null));
    const importBatch = jest.fn(async () => accepted);

    await runSync({ client, importBatch, syncedThrough: null, today, onFinished: jest.fn() });

    expect(importBatch).toHaveBeenCalledWith({ source: 'health_connect', daily_logs: [] });
  });

  it('re-reads from two days before the cursor on later syncs', async () => {
    const client = fakeClient((date) => records(date, null));

    await runSync({
      client,
      importBatch: jest.fn(async () => accepted),
      syncedThrough: '2026-06-19',
      today,
      onFinished: jest.fn(),
    });

    expect(client.readDays).toHaveBeenCalledWith([
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
    ]);
  });

  it('does not move the cursor when the server call fails, so the same days are re-sent next time', async () => {
    const client = fakeClient((date) => records(date, 100));
    const importBatch = jest.fn().mockRejectedValue(new Error('offline'));
    const onFinished = jest.fn();

    await expect(
      runSync({ client, importBatch, syncedThrough: null, today, onFinished }),
    ).rejects.toThrow('offline');
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('does not move the cursor when reading the health store fails', async () => {
    const client = fakeClient((date) => records(date, 100));
    (client.readDays as jest.Mock).mockRejectedValue(new Error('SecurityException'));
    const importBatch = jest.fn();
    const onFinished = jest.fn();

    await expect(
      runSync({ client, importBatch, syncedThrough: null, today, onFinished }),
    ).rejects.toThrow('SecurityException');
    expect(importBatch).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });
});
