import { importDeviceBatchWith } from '@/features/integrations/api/integrationsApi';
import { getHealthClient } from '@/features/integrations/lib/healthClient';
import type { HealthAvailability } from '@/features/integrations/lib/healthSourceClient';
import { createSingleFlight } from '@/features/integrations/lib/singleFlight';
import { runSync } from '@/features/integrations/lib/syncRunner';
import { ensureSyncStoreHydrated, useSyncStore } from '@/features/integrations/store/syncStore';
import { sourcesKeys } from '@/features/home';
import { queryClient } from '@/shared/api/queryClient';

export type SyncOutcome =
  | { kind: 'synced'; daysSent: number; syncedThrough: string }
  | { kind: 'skipped'; reason: 'unsupported' | HealthAvailability | 'needs_permission' };

async function syncOnce(): Promise<SyncOutcome> {
  const client = await getHealthClient();
  if (!client) return { kind: 'skipped', reason: 'unsupported' };

  const availability = await client.getAvailability();
  if (availability !== 'available') return { kind: 'skipped', reason: availability };
  if (!(await client.hasPermission())) return { kind: 'skipped', reason: 'needs_permission' };

  await ensureSyncStoreHydrated();
  const store = useSyncStore.getState();
  store.markAttempt(new Date());

  // A sign-out while this was running means its result (cursor or failure) belongs to nobody: drop it.
  const ifStillSignedIn = (record: (current: typeof store) => void) => {
    const current = useSyncStore.getState();
    if (current.epoch === store.epoch) record(current);
  };

  const result = await runSync({
    client,
    importBatch: (variables) => importDeviceBatchWith(queryClient, variables),
    syncedThrough: store.syncedThrough,
    today: new Date(),
    onFinished: (syncedThrough) => ifStillSignedIn((current) => current.markSynced(syncedThrough)),
  }).catch((error: unknown) => {
    // Keep the reason for a screen to show (and so the next open retries soon), then let the caller
    // log it.
    const message = error instanceof Error ? error.message : 'The sync could not finish.';
    ifStillSignedIn((current) => current.markFailed(message, new Date()));
    throw error;
  });
  // The sources list (Home, Profile) now has a newer "last synced".
  await queryClient.invalidateQueries({ queryKey: sourcesKeys.all });
  return { kind: 'synced', ...result };
}

/** One sync at a time: the app-open sync and the background task share a run if they overlap. */
export const runHealthSync = createSingleFlight(syncOnce);

export type ConnectOutcome = SyncOutcome | { kind: 'permission_denied' };

async function connectOnce(): Promise<ConnectOutcome> {
  const client = await getHealthClient();
  if (!client) return { kind: 'skipped', reason: 'unsupported' };

  const availability = await client.getAvailability();
  if (availability !== 'available') return { kind: 'skipped', reason: availability };
  if (!(await client.requestPermission())) return { kind: 'permission_denied' };
  return runHealthSync();
}

/**
 * Asks for read access, then runs the first sync. The in-app explanation (issue #59) comes first.
 * One request at a time: a second tap, or the app waking while the system dialog is open, shares it.
 */
export const connectHealth = createSingleFlight(connectOnce);
