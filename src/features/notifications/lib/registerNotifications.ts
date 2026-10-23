/**
 * Side-effect module, imported once from the root layout so it runs as soon as the app's
 * JavaScript loads, including a launch caused by tapping the nudge (issue #47). It:
 *  - sets how the nudge shows while the app is open,
 *  - registers the Good / Rough / Open buttons,
 *  - starts listening for taps on them,
 *  - and removes this phone's push registration on sign out, while the session still exists.
 * None of this asks for permission; that only happens after the person agrees on our own sheet.
 */
import { queryClient } from '@/shared/api/queryClient';
import { onBeforeSessionEnd } from '@/shared/lib/sessionCleanup';
import { unregisterDeviceTokenWith } from '@/features/notifications/api/deviceTokenApi';
import {
  configureForegroundPresentation,
  registerCheckInCategory,
} from '@/features/notifications/lib/expoPush';
import { startNotificationResponseHandling } from '@/features/notifications/lib/notificationResponses';

/** Logout must not hang on a bad connection: give the server call a few seconds. */
export const UNREGISTER_TIMEOUT_MS = 5000;

async function withTimeout(task: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([task, new Promise((resolve) => (timer = setTimeout(resolve, ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

export function startNotifications(): void {
  try {
    configureForegroundPresentation();
    void registerCheckInCategory().catch(() => undefined);
    startNotificationResponseHandling();
  } catch {
    // Notifications are optional: the app keeps working if the native module is unavailable.
  }
}

onBeforeSessionEnd(() =>
  withTimeout(unregisterDeviceTokenWith(queryClient), UNREGISTER_TIMEOUT_MS),
);

startNotifications();
