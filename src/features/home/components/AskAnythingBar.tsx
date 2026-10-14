import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

export function AskAnythingBar() {
  return (
    <GlassCard variant="night" radius={radii.pill} padded={false} style={styles.bar}>
      <View style={styles.row}>
        <Text style={styles.placeholder}>Ask me anything</Text>
        <LinearGradient
          colors={[withAlpha(colors.white, 0.3), withAlpha(colors.white, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.micCircle}
        >
          <Svg
            width={componentSizes.homeAskBarIcon}
            height={componentSizes.homeAskBarIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Rect
              x={9}
              y={3}
              width={6}
              height={11}
              rx={3}
              stroke={colors.onNight}
              strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
            />
            <Path
              d="M5 11a7 7 0 0 0 14 0M12 18v3"
              stroke={colors.onNight}
              strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </LinearGradient>
        <View style={styles.sendCircle}>
          <Svg
            width={componentSizes.homeAskBarIcon}
            height={componentSizes.homeAskBarIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M12 19V5M6 11l6-6 6 6"
              stroke={colors.ink}
              strokeWidth={componentSizes.homeAskBarSendStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
    </GlassCard>
  );
}

const iconCircle = {
  width: componentSizes.homeAskBarIconCircle,
  height: componentSizes.homeAskBarIconCircle,
  borderRadius: radii.pill,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const styles = StyleSheet.create({
  bar: {
    marginTop: spacing.ml,
  },
  row: {
    height: componentSizes.homeAskBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.homeAskBarRightPadding,
  },
  placeholder: {
    ...textStyle('body'),
    color: withAlpha(colors.fog, 0.55),
    flex: 1,
  },
  micCircle: {
    ...iconCircle,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.35),
  },
  sendCircle: {
    ...iconCircle,
    backgroundColor: colors.white,
    ...(Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: spacing.xl,
      },
      default: { elevation: 4 },
    }) as ViewStyle),
  },
});
