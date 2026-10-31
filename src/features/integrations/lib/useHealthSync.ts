import { useCallback, useEffect, useState } from 'react';

import { registerHealthBackgroundSync } from '@/features/integrations/lib/backgroundSync';
import { getHealthClient } from '@/features/integrations/lib/healthClient';
import { connectHealth, runHealthSync } from '@/features/integrations/lib/healthSync';
import { useSyncStore } from '@/features/integrations/store/syncStore';
import { reportError } from '@/shared/lib/reportError';

export type HealthSyncStatus =
  | 'checking'
  /** No health store is wired up on this phone (iOS until issue #54, web). */
  | 'unsupported'
  /** Health Connect is not available on this phone. */
  | 'unavailable'
  /** Health Connect is a separate app on Android 9–13 and needs installing or updating. */
  | 'needs_install'
  /** Nothing is allowed yet (never asked, or access was taken away in system settings). */
  | 'needs_permission'
  /** Allowed, and not syncing right now. */
  | 'connected'
  | 'syncing'
  | 'error';

async function readStatus(): Promise<HealthSyncStatus> {
  const client = await getHealthClient();
  if (!client) return 'unsupported';
  const availability = await client.getAvailability();
  if (availability !== 'available') return availability;
  return (await client.hasPermission()) ? 'connected' : 'needs_permission';
}

/**
 * What a source screen needs: the current state, and the actions. The in-app explanation before the
 * system prompt (issue #59) and the rows that show it (#57, #58) call this; none of that UI lives here.
 */
export function useHealthSync() {
  const [status, setStatus] = useState<HealthSyncStatus>('checking');
  const syncedThrough = useSyncStore((state) => state.syncedThrough);
  const lastAttemptAt = useSyncStore((state) => state.lastAttemptAt);

  const refresh = useCallback(async () => setStatus(await readStatus()), []);

  useEffect(() => {
    let cancelled = false;
    void readStatus()
      .catch((error): HealthSyncStatus => {
        reportError(error, 'health-sync.status');
        return 'error';
      })
      .then((next) => {
        if (!cancelled) setStatus(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = useCallback(
    async (action: () => Promise<unknown>) => {
      setStatus('syncing');
      try {
        await action();
        await refresh();
        void registerHealthBackgroundSync().catch((error) =>
          reportError(error, 'health-sync.register-background'),
        );
      } catch (error) {
        reportError(error, 'health-sync.run');
        setStatus('error');
      }
    },
    [refresh],
  );

  return {
    status,
    syncedThrough,
    lastAttemptAt,
    connect: () => sync(connectHealth),
    syncNow: () => sync(runHealthSync),
    openSettings: async () => (await getHealthClient())?.openSettings(),
  };
}
