/**
 * The only file that talks to `expo-notifications` for permission, the push token and the
 * notification category (SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
 * Everything else in this feature stays free of the native module so it can be unit tested.
 *
 * Privacy: the push token is returned to the caller and sent to the backend; it is never logged
 * and never stored by this feature.
 */
import { PermissionStatus } from 'expo';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  EVENING_CHECK_IN_ACTIONS,
  EVENING_CHECK_IN_CATEGORY,
} from '@/features/notifications/lib/checkInNotice';
import {
  devicePlatformSchema,
  type DevicePlatform,
} from '@/features/notifications/api/deviceTokenApi';

export type PushPermission = 'granted' | 'undetermined' | 'denied';

/** Android 8+ needs a channel before a token or a notification (docs: "Channel before token"). */
const ANDROID_CHANNEL_ID = 'default';
/** The check-in nudge is the only thing the app sends, so the channel carries its name (27c). */
const ANDROID_CHANNEL_NAME = 'Evening check-in';

export function currentDevicePlatform(): DevicePlatform | null {
  const parsed = devicePlatformSchema.safeParse(Platform.OS);
  return parsed.success ? parsed.data : null;
}

/** Shows the nudge as a banner while the app is open; no sound and no badge (design shows none). */
export function configureForegroundPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Registers the Good, Rough and Open buttons for `evening_check_in` pushes (design 27c). */
export async function registerCheckInCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(
    EVENING_CHECK_IN_CATEGORY,
    EVENING_CHECK_IN_ACTIONS.map((action) => ({
      identifier: action.identifier,
      buttonTitle: action.buttonTitle,
      options: { opensAppToForeground: action.opensAppToForeground },
    })),
  );
}

function toPermission(result: Notifications.NotificationPermissionsStatus): PushPermission {
  if (result.granted) return 'granted';
  if (result.status === PermissionStatus.UNDETERMINED) return 'undetermined';
  return 'denied';
}

export async function readPushPermission(): Promise<PushPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Triggers the operating system prompt. Call it only after the person agreed on our own sheet. */
export async function requestPushPermission(): Promise<PushPermission> {
  await ensureAndroidChannel();
  return toPermission(await Notifications.requestPermissionsAsync());
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: ANDROID_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** The Expo push token for this phone, or `null` when it cannot be had (simulator, no network). */
export async function readExpoPushToken(): Promise<string | null> {
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string') return null;
  try {
    await ensureAndroidChannel();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
