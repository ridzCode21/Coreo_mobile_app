import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { runHealthSync } from '@/features/integrations/lib/healthSync';
import { reportError } from '@/shared/lib/reportError';

const HEALTH_SYNC_TASK = 'coreo.integrations.health-sync';
/** Minutes. Android treats this as a floor and picks the real time itself. */
const MINIMUM_INTERVAL_MINUTES = 60;

// Task bodies must be defined at module load so the OS can start the app straight into one.
TaskManager.defineTask(HEALTH_SYNC_TASK, async () => {
  try {
    await runHealthSync();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    reportError(error, 'health-sync.background');
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Keeps syncing while the app is closed. Safe to call on every launch. */
export async function registerHealthBackgroundSync(): Promise<void> {
  if (Platform.OS !== 'android') return; // iOS background delivery is issue #54
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK)) return;
  await BackgroundTask.registerTaskAsync(HEALTH_SYNC_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}

export async function unregisterHealthBackgroundSync(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK)) {
    await BackgroundTask.unregisterTaskAsync(HEALTH_SYNC_TASK);
  }
}
