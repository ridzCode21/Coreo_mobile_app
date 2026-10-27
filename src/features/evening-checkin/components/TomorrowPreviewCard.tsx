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

type Props = {
  /** Left out together with `line` when the server sent neither a preview nor a message. */
  eyebrow?: string;
  line?: string;
  action: string;
  onDismiss: () => void;
};

export function TomorrowPreviewCard({ eyebrow, line, action, onDismiss }: Props) {
  return (
    <View style={styles.lift}>
      <GlassCard
        variant="eveningCheckInPreview"
        radius={radii.eveningCheckInPreview}
        style={styles.card}
        padded={false}
      >
        <View style={styles.content}>
          <View style={styles.grabber} />
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {line ? <Text style={styles.line}>{line}</Text> : null}
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
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  // The design stacks two shadows: one thrown upward (this wrapper) and one downward (the card).
  lift: {
    borderRadius: radii.eveningCheckInPreview,
    marginTop: 'auto',
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: componentSizes.eveningCheckInPreviewLiftOffset },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInPreviewLiftRadius,
  },
  card: {
    shadowOffset: { width: 0, height: componentSizes.eveningCheckInPreviewShadowOffset },
    shadowRadius: componentSizes.eveningCheckInPreviewShadowRadius,
  },
  content: {
    paddingBottom: spacing.eveningCheckInPreviewPadBottom,
    paddingHorizontal: spacing.eveningCheckInPreviewPadX,
    paddingTop: spacing.eveningCheckInPreviewPadTop,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: colors.eveningCheckInGrabber,
    borderRadius: radii.eveningCheckInGrabber,
    height: componentSizes.eveningCheckInGrabberHeight,
    marginBottom: spacing.lg,
    width: componentSizes.eveningCheckInGrabberWidth,
  },
  eyebrow: {
    ...textStyle('eveningCheckInPreviewEyebrow'),
    color: colors.eveningCheckInPreviewEyebrow,
  },
  line: { ...textStyle('eveningCheckInPreviewLine'), color: colors.onNight, marginTop: spacing.ms },
  actionGlow: {
    borderRadius: radii.eveningCheckInPreviewAction,
    elevation: componentSizes.eveningCheckInElevation,
    marginTop: spacing.eveningCheckInPreviewActionGap,
    shadowColor: withAlpha(colors.white, 0.5),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInPreviewGlowRadius,
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.eveningCheckInPreviewAction,
    height: componentSizes.eveningCheckInPreviewCloseHeight,
    justifyContent: 'center',
  },
  actionText: { ...textStyle('eveningCheckInPreviewAction'), color: colors.ink },
});
