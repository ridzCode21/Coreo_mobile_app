import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fontFamily, radii, spacing, textStyle, typography } from '@/shared/theme/tokens';

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * Pill chip used across goal/diet-interview/setup selection screens — docs/design-system.md §7.
 * Unselected uses a flat translucent-white fill rather than a full `GlassCard`/`BlurView`: these
 * render many-in-a-row (e.g. multi-select goal lists), and a blur view per chip isn't worth the
 * perf cost for what's a small, mostly-opaque-looking surface at this size.
 */
export function SelectableChip({ label, selected, onPress, style }: SelectableChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.base, selected ? styles.selected : styles.unselected, style]}
    >
      <Text style={selected ? styles.selectedText : styles.unselectedText}>{label}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  selectedText: {
    // Weight 500 at body size — the design calls for this exact combo (no single named
    // typography token covers it; `label` is weight 500 but uppercase/wide-tracked, wrong here).
    fontFamily: fontFamily.poppins500,
    fontSize: typography.body.fontSize,
    color: colors.ink,
  },
  unselectedText: {
    ...textStyle('body'),
    color: colors.ink60,
  },
});
