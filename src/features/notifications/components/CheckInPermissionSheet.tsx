import { Pressable, StyleSheet, Text } from 'react-native';

import { MealSheetSkyFrame, MealSheetSubmitButton } from '@/features/nutrition';
import { PERMISSION_EXPLANATION } from '@/features/notifications/lib/permissionPrompt';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';

type CheckInPermissionSheetProps = {
  visible: boolean;
  busy: boolean;
  onConfirm: () => void;
  onDecline: () => void;
};

/**
 * Our own explanation before the system's notification prompt (issue #47). The system prompt only
 * appears after "confirm"; the plain decline closes the sheet and the app carries on as before.
 * Reuses the existing glass sheet frame and button from the meal sheets.
 */
export function CheckInPermissionSheet({
  visible,
  busy,
  onConfirm,
  onDecline,
}: CheckInPermissionSheetProps) {
  return (
    <MealSheetSkyFrame
      visible={visible}
      title={PERMISSION_EXPLANATION}
      subtitle=""
      onClose={onDecline}
    >
      <MealSheetSubmitButton label="Allow the nudge" busy={busy} onPress={onConfirm} />
      <Pressable
        onPress={onDecline}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Not now"
        style={styles.decline}
      >
        <Text style={styles.declineText}>Not now</Text>
      </Pressable>
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  decline: {
    alignItems: 'center',
    marginTop: spacing.ms,
    paddingVertical: spacing.sm,
  },
  declineText: {
    ...textStyle('small'),
    color: colors.ink55,
  },
});
