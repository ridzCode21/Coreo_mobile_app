import { CheckInPermissionSheet } from '@/features/notifications/components/CheckInPermissionSheet';
import { useCheckInNotifications } from '@/features/notifications/lib/useCheckInNotifications';

/** Mounted once in the signed-in layout: runs the nudge setup and shows the explanation sheet. */
export function CheckInNotificationsHost() {
  const { visible, busy, confirm, decline } = useCheckInNotifications();
  return (
    <CheckInPermissionSheet
      visible={visible}
      busy={busy}
      onConfirm={() => void confirm()}
      onDecline={decline}
    />
  );
}
