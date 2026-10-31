import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

/**
 * Logout cleanup for personal data kept on the phone outside SecureStore (issue #49: the saved Home
 * day and the queued meals). Features register how to reset their in-memory copy; the saved copies
 * on disk are always removed by key here, even if that feature's code never loaded this session.
 * Lives in `shared` so auth does not have to import the features that own the data.
 */
const resetters = new Set<() => void | Promise<void>>();
/** Steps that still need the signed-in session (e.g. a server call), so they run before tokens go. */
const beforeEndSteps = new Set<() => void | Promise<void>>();

const OFFLINE_DATA_KEYS = [
  STORAGE_KEYS.homeCache,
  STORAGE_KEYS.mealQueue,
  STORAGE_KEYS.pendingCheckInAnswers,
  STORAGE_KEYS.healthSyncCursor,
] as const;

/**
 * Registers a step that must run while the person is still signed in, before the tokens are
 * cleared (issue #47: delete this phone's push registration). A failing step never blocks logout.
 */
export function onBeforeSessionEnd(step: () => void | Promise<void>): void {
  beforeEndSteps.add(step);
}

export async function runBeforeSessionEnd(): Promise<void> {
  await Promise.all(
    [...beforeEndSteps].map((step) =>
      Promise.resolve()
        .then(step)
        .catch(() => undefined),
    ),
  );
}

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
