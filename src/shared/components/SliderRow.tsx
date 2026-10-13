import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

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

/** Worklet-safe — called from inside the pan gesture's UI-thread callbacks below. */
function rawFromPct(pct: number, min: number, max: number, step: number): number {
  'worklet';
  const raw = min + pct * (max - min);
  const stepped = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, Math.round(stepped * 100) / 100));
}

type DragOnlySliderOptions = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onLiveChange?: (value: number) => void;
};

/**
 * Keeps the native pan object stable while dragging. Visual shared values and the optional live
 * callback update during the gesture; `onChange` remains release-only so store-backed callers do
 * not rebuild their component tree on every touch frame. Rebuilding the gesture or committing on
 * every frame previously caused native crashes, so the pan stays memoized and commits on release.
 */
export function useDragOnlySlider({
  value,
  min,
  max,
  step,
  onChange,
  onLiveChange,
}: DragOnlySliderOptions) {
  const trackWidth = useSharedValue(1);
  const pct = useSharedValue(toPct(value, min, max));
  const startPct = useSharedValue(toPct(value, min, max));
  const isDragging = useSharedValue(false);
  const [liveValue, setLiveValue] = useState(value);

  const onChangeRef = useRef(onChange);
  const onLiveChangeRef = useRef(onLiveChange);
  useEffect(() => {
    onChangeRef.current = onChange;
    onLiveChangeRef.current = onLiveChange;
  }, [onChange, onLiveChange]);

  useEffect(() => {
    if (isDragging.value) return;
    pct.value = toPct(value, min, max);
    setLiveValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [value, min, max]);

  const reportLive = useCallback((raw: number) => {
    setLiveValue(raw);
    onLiveChangeRef.current?.(raw);
  }, []);
  const reportFinal = useCallback((raw: number) => onChangeRef.current(raw), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          isDragging.value = true;
          startPct.value = pct.value;
        })
        .onUpdate((event) => {
          const deltaPct = trackWidth.value > 0 ? event.translationX / trackWidth.value : 0;
          const nextPct = Math.min(1, Math.max(0, startPct.value + deltaPct));
          pct.value = nextPct;
          runOnJS(reportLive)(rawFromPct(nextPct, min, max, step));
        })
        .onEnd(() => {
          isDragging.value = false;
          runOnJS(reportFinal)(rawFromPct(pct.value, min, max, step));
        }),
    [isDragging, max, min, pct, reportFinal, reportLive, startPct, step, trackWidth],
  );

  const fillStyle = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${pct.value * 100}%` }));
  const onTrackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  return { fillStyle, liveValue, onTrackLayout, pan, thumbStyle };
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
  const { fillStyle, liveValue, onTrackLayout, pan, thumbStyle } = useDragOnlySlider({
    value,
    min,
    max,
    step,
    onChange,
  });

  return (
    <GlassCard variant="light" radius={radii.lg} style={style}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {liveValue}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onTrackLayout}>
          <View style={styles.trackBg} />
          <Animated.View style={[styles.trackFill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
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
