import type {
  ImportDeviceBatchResult,
  ImportDeviceBatchVariables,
} from '@/features/integrations/api/integrationsApi';
import { syncWindow } from '@/features/integrations/lib/cursor';
import { toLocalDateString } from '@/features/integrations/lib/dates';
import { mapDay } from '@/features/integrations/lib/dayTotals';
import type { HealthSourceClient } from '@/features/integrations/lib/healthSourceClient';
import { buildBatches } from '@/features/integrations/lib/payload';
import type { DeviceDailyLog } from '@/features/integrations/lib/types';

export type SyncDeps = {
  client: HealthSourceClient;
  importBatch: (variables: ImportDeviceBatchVariables) => Promise<ImportDeviceBatchResult>;
  syncedThrough: string | null;
  today: Date;
  /** Called once, after every batch was accepted. */
  onFinished: (syncedThrough: string) => void;
};

export type SyncResult = { daysSent: number; syncedThrough: string };

/**
 * One sync: read the days since the last finished sync, send them in batches, and move the cursor
 * only after every batch was accepted. A failed run changes nothing, so the next run re-sends the
 * same days — safe, because the server replaces a day it already has.
 */
export async function runSync({
  client,
  importBatch,
  syncedThrough,
  today,
  onFinished,
}: SyncDeps): Promise<SyncResult> {
  const days = await client.readDays(syncWindow({ today, syncedThrough }));
  const logs = days.map(mapDay).filter((log): log is DeviceDailyLog => log !== null);
  const batches = buildBatches(logs, { today });

  for (const batch of batches) {
    await importBatch({ source: client.source, daily_logs: batch });
  }

  const finishedThrough = toLocalDateString(today);
  onFinished(finishedThrough);
  return { daysSent: logs.length, syncedThrough: finishedThrough };
}
