// Importing this feature starts the notification listeners (see lib/registerNotifications.ts).
import '@/features/notifications/lib/registerNotifications';

export { CheckInNotificationsHost } from '@/features/notifications/components/CheckInNotificationsHost';
export { useRegisterDeviceTokenMutation } from '@/features/notifications/api/deviceTokenApi';
export { useAnswerCheckInNoticeMutation } from '@/features/notifications/api/checkInNoticeApi';
