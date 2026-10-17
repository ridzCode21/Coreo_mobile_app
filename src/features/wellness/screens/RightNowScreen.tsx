import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/shared/components/Screen';
import {
  colors,
  componentSizes,
  duskGradient,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { RightNowBreath } from '@/shared/types/rightNow';

type Props = {
  breath: RightNowBreath;
};

export default function RightNowScreen({ breath }: Props) {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentHeight = Math.max(
    componentSizes.rightNowBreathCircle,
    height - insets.top - insets.bottom - spacing.xxl,
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={duskGradient.colors}
        locations={duskGradient.locations}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent" contentContainerStyle={styles.screen}>
        <View style={[styles.content, { minHeight: contentHeight }]}>
          <Text style={styles.eyebrow}>{breath.eyebrow}</Text>
          <Text style={styles.headline}>{breath.headline}</Text>
          <View style={styles.cueArea}>
            <View style={styles.outerCircle}>
              <View style={styles.halo} />
              <View style={styles.middleRing} />
              <View style={styles.innerRing} />
              <LinearGradient
                colors={[withAlpha(colors.white, 0.9), withAlpha(colors.white, 0.55)]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.coreCircle}
              />
              <Text style={styles.cue}>{breath.cue}</Text>
            </View>
          </View>
          <Text style={styles.pattern}>{breath.pattern}</Text>
          <Text style={styles.line}>{breath.line}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={breath.not_now}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{breath.not_now}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={breath.im_here}
              style={styles.primaryButtonShadow}
            >
              <LinearGradient
                colors={[withAlpha(colors.white, 0.95), withAlpha(colors.white, 0.7)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{breath.im_here}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xs },
  eyebrow: {
    ...textStyle('afterSnapEyebrow'),
    color: withAlpha(colors.white, 0.55),
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  headline: {
    ...textStyle('rightNowHeadline'),
    color: colors.rightNowText,
    textAlign: 'center',
    marginTop: spacing.portionReadoutGap,
  },
  cueArea: {
    flex: 1,
    minHeight: componentSizes.rightNowBreathCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sheetTitleGap,
  },
  outerCircle: {
    width: componentSizes.rightNowBreathCircle,
    height: componentSizes.rightNowBreathCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    inset: 0,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.08),
  },
  middleRing: {
    position: 'absolute',
    top: componentSizes.rightNowBreathMiddleInset,
    right: componentSizes.rightNowBreathMiddleInset,
    bottom: componentSizes.rightNowBreathMiddleInset,
    left: componentSizes.rightNowBreathMiddleInset,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.25),
  },
  innerRing: {
    position: 'absolute',
    top: componentSizes.rightNowBreathInnerInset,
    right: componentSizes.rightNowBreathInnerInset,
    bottom: componentSizes.rightNowBreathInnerInset,
    left: componentSizes.rightNowBreathInnerInset,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.35),
  },
  coreCircle: {
    position: 'absolute',
    top: componentSizes.rightNowBreathCoreInset,
    right: componentSizes.rightNowBreathCoreInset,
    bottom: componentSizes.rightNowBreathCoreInset,
    left: componentSizes.rightNowBreathCoreInset,
    borderRadius: radii.pill,
    shadowColor: withAlpha(colors.white, 0.5),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.homeAskBarHeight,
  },
  cue: { ...textStyle('rightNowCue'), color: colors.ink },
  pattern: {
    ...textStyle('rightNowPattern'),
    color: withAlpha(colors.white, 0.65),
    textAlign: 'center',
  },
  line: {
    ...textStyle('rightNowLine'),
    color: withAlpha(colors.white, 0.45),
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  secondaryButton: {
    flex: 1,
    height: componentSizes.wellnessSecondaryActionHeight,
    borderRadius: radii.planAction,
    backgroundColor: withAlpha(colors.white, 0.14),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { ...textStyle('bodySm'), color: withAlpha(colors.white, 0.8) },
  primaryButtonShadow: {
    flex: 1,
    borderRadius: radii.planAction,
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 1,
    shadowRadius: spacing.xxxl,
  },
  primaryButton: {
    height: componentSizes.wellnessSecondaryActionHeight,
    borderRadius: radii.planAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...textStyle('rightNowButton'), color: colors.ink },
});
