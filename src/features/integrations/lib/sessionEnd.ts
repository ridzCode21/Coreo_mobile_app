import { unregisterHealthBackgroundSync } from '@/features/integrations/lib/backgroundSync';
import { useSyncStore } from '@/features/integrations/store/syncStore';
import { onSessionEnd } from '@/shared/lib/sessionCleanup';

// The cursor belongs to the signed-in account. Without this, the next person to sign in on this
// phone would skip their first backfill, and the background task would keep waking for no one.
onSessionEnd(async () => {
  useSyncStore.getState().reset();
  await unregisterHealthBackgroundSync();
});
