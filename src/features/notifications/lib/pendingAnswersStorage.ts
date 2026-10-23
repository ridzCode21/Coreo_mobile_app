import { storage, STORAGE_KEYS } from '@/shared/lib/storage';
import {
  parsePendingAnswers,
  type PendingAnswer,
} from '@/features/notifications/lib/pendingAnswers';

/**
 * Disk side of the unsent lock-screen answers. Plain (unencrypted) app storage: entries hold only
 * a notice id and `good` or `rough`, never tokens (those stay in SecureStore). Cleared at logout.
 */
export async function readPendingAnswers(): Promise<PendingAnswer[]> {
  try {
    return parsePendingAnswers(await storage.getJSON<unknown>(STORAGE_KEYS.pendingCheckInAnswers));
  } catch {
    return [];
  }
}

export async function writePendingAnswers(queue: PendingAnswer[]): Promise<void> {
  if (queue.length === 0) {
    await storage.removeItem(STORAGE_KEYS.pendingCheckInAnswers);
    return;
  }
  await storage.setJSON(STORAGE_KEYS.pendingCheckInAnswers, queue);
}
