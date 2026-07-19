import { useCallback } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

const THUMB_SIZE = 18;

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  style?: ViewStyle;
};

function toPct(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * Draggable glass-card slider — docs/design-system.md §7 `SliderRow`. Used for onboarding's
 * numeric answers (age/height/weight, diet target weight) where dragging is faster than typing.
 * Drag-only (no tap-to-jump) — a deliberate scope cut, not a missing feature.
 */
export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  style,
}: SliderRowProps) {
  const trackWidth = useSharedValue(1);
  const startPct = useSharedValue(toPct(value, min, max));

  const commit = useCallback(
    (pct: number) => {
      const raw = min + pct * (max - min);
      const stepped = Math.round(raw / step) * step;
      const next = Math.min(max, Math.max(min, stepped));
      if (next !== value) onChange(next);
    },
    [min, max, step, value, onChange],
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      startPct.value = toPct(value, min, max);
    })
    .onUpdate((event) => {
      const deltaPct = trackWidth.value > 0 ? event.translationX / trackWidth.value : 0;
      const pct = Math.min(1, Math.max(0, startPct.value + deltaPct));
      runOnJS(commit)(pct);
    });

  const pct = toPct(value, min, max);

  return (
    <GlassCard variant="light" radius={radii.lg} style={style}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={(event) => {
            trackWidth.value = event.nativeEvent.layout.width;
          }}
        >
          <View style={styles.trackBg} />
          <View style={[styles.trackFill, { width: `${pct * 100}%` }]} />
          <View style={[styles.thumb, { left: `${pct * 100}%` }]} />
        </View>
      </GestureDetector>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    ...textStyle('label'),
    color: colors.label,
  },
  value: {
    ...textStyle('cardValue'),
    color: colors.ink,
  },
  track: {
    height: 26,
    marginTop: spacing.xs,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(23,25,29,0.16)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(23,25,29,0.6)',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(18,42,70,0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      default: { elevation: 3 },
    }),
  },
});
