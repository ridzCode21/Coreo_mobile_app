/** Issue #55 — signing out must not leave the previous account's sync cursor on the phone. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import '@/features/integrations/lib/sessionEnd';
import { unregisterHealthBackgroundSync } from '@/features/integrations/lib/backgroundSync';
import { useSyncStore } from '@/features/integrations/store/syncStore';
import { runSessionCleanup } from '@/shared/lib/sessionCleanup';
import { STORAGE_KEYS } from '@/shared/lib/storage';

jest.mock('@/features/integrations/lib/backgroundSync', () => ({
  unregisterHealthBackgroundSync: jest.fn(async () => undefined),
}));

describe('sign-out cleanup for health sync', () => {
  beforeEach(() => {
    useSyncStore.setState({ syncedThrough: '2026-06-20', lastAttemptAt: '2026-06-20T10:00:00Z' });
  });

  it('forgets how far this phone had synced, so the next account starts with a full backfill', async () => {
    await runSessionCleanup();
    expect(useSyncStore.getState().syncedThrough).toBeNull();
    expect(useSyncStore.getState().lastAttemptAt).toBeNull();
  });

  it('stops the background task', async () => {
    await runSessionCleanup();
    expect(unregisterHealthBackgroundSync).toHaveBeenCalled();
  });

  it('leaves no cursor on the phone, even one written before the feature loaded', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.healthSyncCursor,
      '{"state":{"syncedThrough":"2026-06-20"}}',
    );
    await runSessionCleanup();
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.healthSyncCursor);
    // Removed, or rewritten blank by the store's own reset: either way no account data remains.
    expect(saved === null || JSON.parse(saved).state.syncedThrough === null).toBe(true);
  });
});
