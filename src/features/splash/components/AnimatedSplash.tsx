import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, textStyle } from '@/shared/theme/tokens';
import { WAVE_PATH, WAVE_PATH_LENGTH, WAVE_VIEWBOX } from '@/shared/components/WaveMark';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const WAVE_DRAW_MS = 900;
const WORDMARK_FADE_MS = 300;
/** Enforced regardless of animation speed, so a fast boot never flashes the splash away —
 * docs/implementation-plan.md §5 acceptance criteria. */
const MIN_DISPLAY_MS = 1200;

/** The wave's "now" point — the end of WAVE_PATH — gets a soft glow once drawn in, matching the
 * signature wave treatment (docs/design-system.md §5/§6.1). */
const NOW_POINT = { x: 104, y: 60 };

type AnimatedSplashProps = {
  onFinished: () => void;
};

/**
 * The branded intro: the wave draws itself in, then the wordmark settles — the first
 * experiment proving the design system, tokens, motion, and SVG logo translate faithfully to
 * React Native (docs/implementation-plan.md §5). Calls `onFinished` once the animation (or its
 * reduced-motion equivalent) and the minimum display time have both elapsed.
 */
export function AnimatedSplash({ onFinished }: AnimatedSplashProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const dashOffset = useSharedValue(WAVE_PATH_LENGTH);
  const wordmarkOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    // Wait to know the reduced-motion preference before rendering/animating anything, so there's
    // never a flash of the "wrong" (animated vs. static) state.
    if (reduceMotion === null) return;

    const mountedAt = Date.now();
    const finish = () => {
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - mountedAt));
      setTimeout(onFinished, remaining);
    };

    if (reduceMotion) {
      dashOffset.value = 0;
      wordmarkOpacity.value = 1;
      glowOpacity.value = 1;
      finish();
      return;
    }

    dashOffset.value = withTiming(
      0,
      { duration: WAVE_DRAW_MS, easing: Easing.out(Easing.cubic) },
      () => {
        glowOpacity.value = withTiming(1, { duration: 200 });
        wordmarkOpacity.value = withTiming(1, { duration: WORDMARK_FADE_MS }, () => {
          runOnJS(finish)();
        });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [reduceMotion]);

  const waveAnimatedProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));
  const glowAnimatedProps = useAnimatedProps(() => ({ opacity: glowOpacity.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({ opacity: wordmarkOpacity.value }));

  if (reduceMotion === null) return null;

  return (
    <View style={styles.center}>
      <Svg width={96} height={96} viewBox={WAVE_VIEWBOX}>
        <AnimatedPath
          d={WAVE_PATH}
          stroke={colors.ink}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[WAVE_PATH_LENGTH, WAVE_PATH_LENGTH]}
          animatedProps={waveAnimatedProps}
        />
        <AnimatedCircle
          cx={NOW_POINT.x}
          cy={NOW_POINT.y}
          r={5}
          fill={colors.white}
          animatedProps={glowAnimatedProps}
        />
      </Svg>
      <Animated.Text style={[textStyle('wordmark'), { color: colors.ink }, wordmarkStyle]}>
        coreo
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
