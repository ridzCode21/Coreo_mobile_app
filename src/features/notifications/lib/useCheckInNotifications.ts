import { useCallback, useEffect, useState } from 'react';

import { storage, STORAGE_KEYS } from '@/shared/lib/storage';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { useWellnessProfileQuery } from '@/features/wellness';
import { useRegisterDeviceTokenMutation } from '@/features/notifications/api/deviceTokenApi';
import {
  currentDevicePlatform,
  readExpoPushToken,
  readPushPermission,
  requestPushPermission,
  type PushPermission,
} from '@/features/notifications/lib/expoPush';
import { flushPendingAnswers } from '@/features/notifications/lib/notificationResponses';
import { shouldShowPermissionPrompt } from '@/features/notifications/lib/permissionPrompt';

/**
 * Mount once for the signed-in app (`(app)/_layout`, through `CheckInNotificationsHost`).
 *  - Sends lock-screen answers that could not be sent earlier, on start and on reconnect.
 *  - When the person already allowed notifications, registers this phone (a repeat is harmless:
 *    the server answers 200 for a token it already has).
 *  - Otherwise decides whether to show our explanation sheet, and runs the confirm and decline.
 */
export function useCheckInNotifications() {
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const profile = useWellnessProfileQuery();
  const register = useRegisterDeviceTokenMutation();
  const { mutateAsync: registerToken } = register;
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [declined, setDeclined] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);

  const registerThisPhone = useCallback(async () => {
    const platform = currentDevicePlatform();
    const token = await readExpoPushToken();
    if (!platform || !token) return;
    await registerToken({ token, platform });
  }, [registerToken]);

  useEffect(() => {
    if (isOnline) void flushPendingAnswers();
  }, [isOnline]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [status, wasDeclined] = await Promise.all([
        readPushPermission().catch((): PushPermission => 'denied'),
        storage.getJSON<boolean>(STORAGE_KEYS.checkInPromptDeclined).catch(() => null),
      ]);
      if (cancelled) return;
      setPermission(status);
      setDeclined(wasDeclined ?? false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (permission === 'granted' && isOnline) void registerThisPhone().catch(() => undefined);
  }, [permission, isOnline, registerThisPhone]);

  const visible =
    declined !== null &&
    shouldShowPermissionPrompt({
      checkInStyle: profile.data?.check_in_style,
      permission,
      declined,
    });

  /** The person agreed on our sheet: now, and only now, the system asks. */
  const confirm = useCallback(async () => {
    setAsking(true);
    try {
      // Allowed: the effect above registers this phone as soon as the permission changes.
      setPermission(await requestPushPermission());
    } catch {
      // A refused or failed request leaves the app working as before: no dead end.
    } finally {
      setAsking(false);
    }
  }, []);

  const decline = useCallback(() => {
    setDeclined(true);
    void storage.setJSON(STORAGE_KEYS.checkInPromptDeclined, true).catch(() => undefined);
  }, []);

  return { visible, busy: asking, confirm, decline };
}
