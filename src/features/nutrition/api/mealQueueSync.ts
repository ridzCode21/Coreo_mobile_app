import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { nutritionKeys, postFoodEntry } from '@/features/nutrition/api/nutritionApi';
import { pendingMeals, rejectedMeals, type QueuedMeal } from '@/features/nutrition/lib/mealQueue';
import { useMealQueueStore } from '@/features/nutrition/store/mealQueueStore';

function sendQueuedMeal(meal: QueuedMeal) {
  return postFoodEntry(meal.date, meal.entry);
}

/**
 * Sends the queued meals (oldest first) and then refreshes the nutrition data, which includes the
 * Home summary. The store refuses to start a second send while one is running, so two quick
 * reconnects send each meal once.
 */
export async function syncMealQueue(queryClient: QueryClient): Promise<void> {
  const result = await useMealQueueStore.getState().flush(sendQueuedMeal);
  if (result && result.sent > 0) {
    await queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
  }
}

/**
 * Mount once for the signed-in app (`(app)/_layout`). Loads the saved queue after an app restart
 * and sends it whenever we are online and something is waiting: on start, on reconnect, and when a
 * meal is queued after a failed send while the phone still looked online.
 */
export function useMealQueueSync(): void {
  const queryClient = useQueryClient();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const hydrated = useMealQueueStore((state) => state.hydrated);
  const pendingCount = useMealQueueStore((state) => pendingMeals(state.queue).length);

  useEffect(() => {
    void useMealQueueStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!isOnline || !hydrated || pendingCount === 0) return;
    void syncMealQueue(queryClient);
  }, [isOnline, hydrated, pendingCount, queryClient]);
}

/**
 * Meals the server refused when they were sent. They stay saved (never silently dropped) until the
 * user dismisses the notice on Home.
 */
export function useRejectedMeals(): { count: number; dismiss: () => void } {
  const count = useMealQueueStore((state) => rejectedMeals(state.queue).length);
  return { count, dismiss: () => void useMealQueueStore.getState().dismissRejected() };
}
