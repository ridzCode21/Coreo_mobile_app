import { storage, STORAGE_KEYS } from '@/shared/lib/storage';
import { parseMealQueue, type QueuedMeal } from '@/features/nutrition/lib/mealQueue';

/**
 * Disk side of the offline meal queue. Plain (unencrypted) app storage: the queue holds food data
 * only, never tokens (those stay in SecureStore). Cleared at logout.
 */
export async function readMealQueue(): Promise<QueuedMeal[]> {
  try {
    return parseMealQueue(await storage.getJSON<unknown>(STORAGE_KEYS.mealQueue));
  } catch {
    return [];
  }
}

export async function writeMealQueue(queue: QueuedMeal[]): Promise<void> {
  if (queue.length === 0) {
    await storage.removeItem(STORAGE_KEYS.mealQueue);
    return;
  }
  await storage.setJSON(STORAGE_KEYS.mealQueue, queue);
}

export async function clearMealQueueStorage(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.mealQueue);
}
