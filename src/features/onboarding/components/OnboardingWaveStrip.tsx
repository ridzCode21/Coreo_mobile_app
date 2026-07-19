import { useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme/tokens';

type OnboardingWaveStripProps = {
  /** 0–1: portion rendered solid ("real"/past); the remainder renders dashed ("projected"),
   * matching the wave-chart convention in docs/design-system.md §6.1. */
  progress?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
};

function wavePath(w: number, h: number): string {
  const midY = h / 2;
  const amp = h * 0.32;
  return `M0 ${midY} C ${w * 0.09} ${midY - amp}, ${w * 0.18} ${midY - amp}, ${w * 0.27} ${midY} S ${w * 0.45} ${midY + amp}, ${w * 0.54} ${midY} S ${w * 0.72} ${midY - amp}, ${w * 0.81} ${midY} S ${w * 0.96} ${midY + amp}, ${w} ${midY}`;
}

/**
 * Simplified stand-in for the full signature WaveChart (design-system.md §6.1) used on the
 * onboarding Reading/Promise/Save screens, which show a wave visual with no real user data behind
 * it yet. The real data-driven primitive (amplitude scaled to the user's own last-30-days range)
 * is later work, once `GET /daily-summary/` exists to drive it (Phase 4+) — this is deliberately
 * decorative only.
 */
export function OnboardingWaveStrip({
  progress = 0.6,
  height = 56,
  color = colors.ink,
  style,
}: OnboardingWaveStripProps) {
  const [width, setWidth] = useState(0);
  const clamped = Math.min(1, Math.max(0, progress));
  const d = useMemo(() => (width > 0 ? wavePath(width, height) : ''), [width, height]);

  return (
    <View
      style={[styles.wrap, { height }, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Path
              d={d}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray="6,7"
              opacity={0.5}
            />
          </Svg>
          <View style={[styles.solidClip, { width: `${clamped * 100}%` }]}>
            <Svg width={width} height={height}>
              <Path d={d} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
            </Svg>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', position: 'relative' },
  solidClip: { position: 'absolute', left: 0, top: 0, height: '100%', overflow: 'hidden' },
});
