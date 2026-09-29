import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * Pill chip used across goal/diet-interview/setup selection screens — docs/design-system.md §7.
 * Unselected reads as light glass via a two-stop diagonal gradient (matches the design's
 * `linear-gradient(135deg, rgba(255,255,255,.5), rgba(255,255,255,.18))`) rather than a flat fill —
 * a full `GlassCard`/`BlurView` per chip isn't used since these render many-in-a-row (e.g.
 * multi-select goal lists) and a blur view per chip isn't worth the perf cost at this size.
 */
export function SelectableChip({ label, selected, onPress, style }: SelectableChipProps) {
  if (selected) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.base, styles.selected, style]}
      >
        <Text style={styles.selectedText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles.unselected, style]}
      >
        <Text style={styles.unselectedText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  selected: {
    backgroundColor: colors.white,
    shadowColor: 'rgba(18,42,70,0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  unselected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  // Both states MUST share the exact same `fontSize`/`lineHeight` box (from `textStyle('body')`)
  // — only `fontFamily` (weight) and `color` differ. The original code gave `selectedText` a
  // weight bump *without* `textStyle('body')`'s pinned `lineHeight`, so Poppins-Medium's own
  // (unpinned) default line box came out visibly shorter than Poppins-Light's explicit 1.85×
  // line-height the instant a chip was tapped — the whole pill appeared to resize on selection.
  // Locking both to the same base guarantees the chip's footprint never changes.
  selectedText: {
    ...textStyle('body'),
    fontFamily: fontFamily.poppins500,
    color: colors.ink,
  },
  unselectedText: {
    ...textStyle('body'),
    color: colors.ink60,
  },
});
