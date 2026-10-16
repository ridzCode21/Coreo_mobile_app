import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontFamily, glass, radii, spacing, textStyle } from '@/shared/theme/tokens';

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'sheet';
};

type SelectableChipDisplayProps = Omit<SelectableChipProps, 'onPress'>;

/**
 * Pill chip used across goal/diet-interview/setup selection screens — docs/design-system.md §7.
 * Unselected reads as light glass via a two-stop diagonal gradient (matches the design's
 * `linear-gradient(135deg, rgba(255,255,255,.5), rgba(255,255,255,.14))`) rather than a flat fill —
 * a full `GlassCard`/`BlurView` per chip isn't used since these render many-in-a-row (e.g.
 * multi-select goal lists) and a blur view per chip isn't worth the perf cost at this size.
 */
export function SelectableChip({
  label,
  selected,
  onPress,
  style,
  variant = 'default',
}: SelectableChipProps) {
  if (selected) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.base, styles.selected, style]}
      >
        <ChipLabel label={label} selected variant={variant} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <SelectableChipDisplay label={label} selected={false} style={style} variant={variant} />
    </Pressable>
  );
}

/** Same visual states as `SelectableChip`, for contextual labels that are not actions. */
export function SelectableChipDisplay({
  label,
  selected,
  style,
  variant = 'default',
}: SelectableChipDisplayProps) {
  if (selected) {
    return (
      <View style={[styles.base, styles.selected, style]}>
        <ChipLabel label={label} selected variant={variant} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={glass.chip.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, styles.unselected, style]}
    >
      <ChipLabel label={label} selected={false} variant={variant} />
    </LinearGradient>
  );
}

function ChipLabel({
  label,
  selected,
  variant,
}: Pick<SelectableChipProps, 'label' | 'selected'> & {
  variant: NonNullable<SelectableChipProps['variant']>;
}) {
  return (
    <Text
      style={[
        selected ? styles.selectedText : styles.unselectedText,
        variant === 'sheet' && (selected ? styles.sheetSelectedText : styles.sheetUnselectedText),
      ]}
    >
      {label}
    </Text>
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
    shadowColor: glass.selectableChipSelected.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  unselected: {
    borderWidth: 1,
    borderColor: glass.chip.border,
  },
  // Both states MUST share the exact same `fontSize`/`lineHeight` box within each variant — only
  // `fontFamily` (weight) and `color` differ. The original code gave `selectedText` a
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
    color: colors.ink62,
  },
  sheetSelectedText: {
    ...textStyle('small'),
    fontFamily: fontFamily.poppins500,
  },
  sheetUnselectedText: {
    ...textStyle('small'),
    color: colors.ink75,
  },
});
