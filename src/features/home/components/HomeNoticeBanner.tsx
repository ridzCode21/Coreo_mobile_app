import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type HomeNoticeBannerProps = {
  text: string;
  /** Design 25c shows the crossed-out wifi glyph for the offline banner. */
  showOfflineIcon?: boolean;
  /** When set the banner is a button (used to dismiss a notice). */
  onPress?: () => void;
  accessibilityHint?: string;
};

/** Slim glass line under the Home header: "No connection. Today is cached from 2:14 PM." */
export function HomeNoticeBanner({
  text,
  showOfflineIcon = false,
  onPress,
  accessibilityHint,
}: HomeNoticeBannerProps) {
  const content = (
    <GlassCard variant="light" radius={radii.legal} padded={false} style={styles.card}>
      <View style={styles.row}>
        {showOfflineIcon ? (
          <Svg
            width={componentSizes.offlineBannerIcon}
            height={componentSizes.offlineBannerIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M2 2l20 20M8.5 16.5a7 7 0 0 1 7.5-1.5M5 12.5a11 11 0 0 1 3-2M19 12.5a11 11 0 0 0-2.5-2M12 20h.01"
              stroke={colors.ink60}
              strokeWidth={componentSizes.offlineBannerIconStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
        <Text style={styles.text}>{text}</Text>
      </View>
    </GlassCard>
  );

  if (!onPress) return <View accessibilityRole="alert">{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.offlineBannerPadY,
    paddingHorizontal: spacing.offlineBannerPadX,
  },
  text: {
    ...textStyle('linkSm'),
    color: colors.ink60,
    flexShrink: 1,
  },
});
