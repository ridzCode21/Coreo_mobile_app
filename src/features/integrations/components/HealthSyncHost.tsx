import { useEffect } from 'react';
import { AppState } from 'react-native';

import { registerHealthBackgroundSync } from '@/features/integrations/lib/backgroundSync';
import { runHealthSync } from '@/features/integrations/lib/healthSync';
import { isSyncDue } from '@/features/integrations/lib/syncThrottle';
import { ensureSyncStoreHydrated, useSyncStore } from '@/features/integrations/store/syncStore';
import { reportError } from '@/shared/lib/reportError';

async function syncIfDue(): Promise<void> {
  await ensureSyncStoreHydrated();
  const { lastAttemptAt, lastFailure } = useSyncStore.getState();
  if (!isSyncDue(lastAttemptAt, Date.now(), lastFailure !== null)) return;
  // Skipped (not connected yet) or failed (offline, server down): nothing to show, and the next
  // open or background run tries again from the same cursor.
  const outcome = await runHealthSync();
  if (outcome.kind === 'synced') await registerHealthBackgroundSync();
}

/** Mounted once in the signed-in layout: syncs when the app opens and when it comes back. No UI. */
export function HealthSyncHost() {
  useEffect(() => {
    const run = () => void syncIfDue().catch((error) => reportError(error, 'health-sync.open'));
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, []);
  return null;
}
