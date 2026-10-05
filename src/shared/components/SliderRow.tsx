import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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
  return Math.min(max, Math.max(min, stepped));
}

/**
 * Draggable glass-card slider — docs/design-system.md §7 `SliderRow`. Used for onboarding's
 * numeric answers (age/height/weight, diet target weight) where dragging is faster than typing.
 * Drag-only (no tap-to-jump) — a deliberate scope cut, not a missing feature.
 *
 * Every pixel of drag used to call `onChange` synchronously (via `runOnJS`), which for callers
 * backed by a Zustand store re-rendered this component on every single touch-move frame. Because
 * the `Gesture.Pan()` object was rebuilt fresh on every render (not memoized), that feedback loop
 * tore down and rebuilt the *active* native gesture handler mid-drag — the real cause of the
 * "error when the slider is moved" crash. Fixed by: (1) building the gesture exactly once via
 * `useMemo`, (2) driving the visual fill/thumb/live-value purely from a UI-thread shared value
 * while dragging (no JS bridge crossings per frame), and (3) only calling `onChange` once, on
 * release — a `useEffect` still lets an *external* value change (e.g. hydration) resync the
 * visual position without fighting an in-progress drag.
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
  const pct = useSharedValue(toPct(value, min, max));
  // Computed the same way as `pct` above, rather than read from `pct.value` — reading a shared
  // value's `.value` during render (as opposed to inside a worklet/effect) is what Reanimated's
  // strict mode warns about ("Reading from `value` during component render"); both are the same
  // number on first mount, so this sidesteps the warning without changing behavior.
  const startPct = useSharedValue(toPct(value, min, max));
  const isDragging = useSharedValue(false);
  const [liveValue, setLiveValue] = useState(value);

  // Keeps `onChange` reachable from the once-created gesture below without needing to rebuild it
  // (a stable `useCallback` identity is required there) — reading `.current` at call time always
  // gets the latest prop.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isDragging.value) return;
    pct.value = toPct(value, min, max);
    setLiveValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [value, min, max]);

  const reportLive = useCallback((raw: number) => setLiveValue(raw), []);
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
    // `pct`/`startPct`/`trackWidth`/`isDragging` are stable shared-value refs; `reportLive`/
    // `reportFinal` are stable (empty-dep `useCallback`s reading the latest prop via a ref) — so
    // this gesture is truly built once per mounted slider, not on every render.
    [pct, startPct, trackWidth, isDragging, reportLive, reportFinal, min, max, step],
  );

  const fillStyle = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${pct.value * 100}%` }));

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
        <View
          style={styles.track}
          onLayout={(event) => {
            trackWidth.value = event.nativeEvent.layout.width;
          }}
        >
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
