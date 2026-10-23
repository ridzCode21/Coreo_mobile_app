import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

/**
 * Logout cleanup for personal data kept on the phone outside SecureStore (issue #49: the saved Home
 * day and the queued meals). Features register how to reset their in-memory copy; the saved copies
 * on disk are always removed by key here, even if that feature's code never loaded this session.
 * Lives in `shared` so auth does not have to import the features that own the data.
 */
const resetters = new Set<() => void | Promise<void>>();

const OFFLINE_DATA_KEYS = [STORAGE_KEYS.homeCache, STORAGE_KEYS.mealQueue] as const;

export function onSessionEnd(reset: () => void | Promise<void>): void {
  resetters.add(reset);
}

export async function runSessionCleanup(): Promise<void> {
  await Promise.all([
    ...[...resetters].map((reset) =>
      Promise.resolve()
        .then(reset)
        .catch(() => undefined),
    ),
    ...OFFLINE_DATA_KEYS.map((key) => storage.removeItem(key).catch(() => undefined)),
  ]);
}
