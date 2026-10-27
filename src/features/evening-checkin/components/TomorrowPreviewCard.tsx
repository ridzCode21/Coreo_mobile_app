import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type Props = { eyebrow: string; line: string; action: string; onDismiss: () => void };

export function TomorrowPreviewCard({ eyebrow, line, action, onDismiss }: Props) {
  return (
    <GlassCard
      variant="night"
      radius={radii.eveningCheckInPreview}
      style={styles.card}
      contentPaddingVertical={spacing.xxl}
      contentPaddingHorizontal={spacing.xl}
    >
      <View style={styles.grabber} />
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.line}>{line}</Text>
      <View style={styles.actionGlow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onDismiss}
          style={styles.action}
        >
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 'auto' },
  grabber: {
    alignSelf: 'center',
    backgroundColor: colors.eveningCheckInGrabber,
    borderRadius: radii.weekReviewBar,
    height: componentSizes.sheetGrabberHeight,
    marginBottom: spacing.lg,
    width: componentSizes.sheetGrabberWidth,
  },
  eyebrow: { ...textStyle('eveningCheckInPreviewEyebrow'), color: colors.usualOnNightMuted },
  line: { ...textStyle('eveningCheckInPreviewLine'), color: colors.onNight, marginTop: spacing.ms },
  actionGlow: {
    borderRadius: radii.planAction,
    elevation: componentSizes.dietElevation,
    shadowColor: withAlpha(colors.white, 0.5),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInPreviewGlowRadius,
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.planAction,
    height: componentSizes.eveningCheckInPreviewCloseHeight,
    justifyContent: 'center',
    marginTop: spacing.sheetTitleGap,
  },
  actionText: { ...textStyle('eveningCheckInPreviewAction'), color: colors.ink },
});
