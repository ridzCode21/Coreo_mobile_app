import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/shared/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SAMPLE_COUNT = 32;
const CYCLES = 2.2;
const PHASE = 0.4;
const SWEEP_MS = 900;

type WaveChartProps = {
  /** 0–1: portion rendered solid ("past/actual"); the remainder renders dashed
   * ("future/projected") — the signature wave convention, design-system.md §6.1. */
  progress?: number;
  height?: number;
  color?: string;
  /** Wave amplitude as a fraction of `height`. Defaults calm/low — matches the design's
   * near-flat "synced" wave rather than a prominent sine. Real data-driven usage (amplitude
   * scaled to the user's own last-30-days range) is later work once a metrics endpoint exists to
   * drive it; this primitive takes amplitude as a prop either way. */
  amplitudeRatio?: number;
  /** Soft area fill under the solid (past) segment. */
  areaFill?: boolean;
  /** Glowing white dot at the solid→dashed boundary ("now"). */
  glowDot?: boolean;
  /** Animate the solid portion sweeping in on mount; static at final `progress` under
   * reduced-motion (design-system.md §5). */
  animated?: boolean;
  style?: ViewStyle;
};

function waveYAtRatio(t: number, height: number, amplitudeRatio: number): number {
  'worklet';
  const midY = height / 2;
  const amp = height * amplitudeRatio;
  return midY - amp * Math.sin(t * Math.PI * CYCLES + PHASE);
}

function buildWavePath(width: number, height: number, amplitudeRatio: number): string {
  const segments: string[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    const t = i / SAMPLE_COUNT;
    const x = t * width;
    const y = waveYAtRatio(t, height, amplitudeRatio);
    segments.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return segments.join(' ');
}

function buildAreaPath(width: number, height: number, amplitudeRatio: number): string {
  return `${buildWavePath(width, height, amplitudeRatio)} L${width.toFixed(2)} ${height.toFixed(2)} L0 ${height.toFixed(2)} Z`;
}

/**
 * The signature wave chart (design-system.md §6.1, promoted from the onboarding-only
 * `OnboardingWaveStrip`): solid stroke for past/actual, dashed for future/projected, a glowing
 * white dot at the boundary, optional area fill under the solid segment. Used by the onboarding
 * Reading/Promise/Save/Calibrating screens today; the eventual home "today" wave and week-review
 * charts should reuse this rather than a bespoke chart.
 */
export function WaveChart({
  progress = 0.6,
  height = 56,
  color = colors.ink,
  amplitudeRatio = 0.16,
  areaFill = true,
  glowDot = true,
  animated = true,
  style,
}: WaveChartProps) {
  const [width, setWidth] = useState(0);
  const clampedProgress = Math.min(1, Math.max(0, progress));

  const progressAnim = useSharedValue(0);
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    if (!animated) {
      progressAnim.value = clampedProgress;
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      progressAnim.value = reduceMotion
        ? clampedProgress
        : withTiming(clampedProgress, { duration: SWEEP_MS, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [clampedProgress, animated]);

  const fullPath = useMemo(
    () => (width > 0 ? buildWavePath(width, height, amplitudeRatio) : ''),
    [width, height, amplitudeRatio],
  );
  const areaPath = useMemo(
    () => (width > 0 ? buildAreaPath(width, height, amplitudeRatio) : ''),
    [width, height, amplitudeRatio],
  );

  const clipStyle = useAnimatedStyle(() => ({ width: progressAnim.value * widthAnim.value }));
  const dotProps = useAnimatedProps(() => ({
    cx: progressAnim.value * widthAnim.value,
    cy: waveYAtRatio(progressAnim.value, height, amplitudeRatio),
  }));

  return (
    <View
      style={[styles.wrap, { height }, style]}
      onLayout={(event) => {
        const measured = event.nativeEvent.layout.width;
        setWidth(measured);
        widthAnim.value = measured;
      }}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Path
              d={fullPath}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="5,7"
              opacity={0.45}
            />
          </Svg>
          <Animated.View style={[styles.solidClip, { height }, clipStyle]}>
            <Svg width={width} height={height}>
              {areaFill ? (
                <Path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
              ) : null}
              <Path
                d={fullPath}
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
          {glowDot ? (
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
              <AnimatedCircle
                animatedProps={dotProps}
                r={9}
                fill={colors.white}
                fillOpacity={0.4}
              />
              <AnimatedCircle animatedProps={dotProps} r={3.5} fill={colors.white} />
            </Svg>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', position: 'relative' },
  solidClip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
});
