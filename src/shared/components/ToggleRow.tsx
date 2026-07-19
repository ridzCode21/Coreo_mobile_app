import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { colors, fontFamily, radii, spacing, textStyle, typography } from '@/shared/theme/tokens';

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  radius?: number;
  minHeight?: number;
  style?: ViewStyle;
};

/**
 * Full-width selectable row (title + optional subtitle, trailing checkmark) — not in the original
 * docs/design-system.md §7 inventory but reused 3x across onboarding (Pillars 7a·4, Sources 7a·5,
 * Wellness check-ins 17a·5), so promoted to shared per architecture.md's "no per-screen
 * reimplementation" rule. See design-system.md changelog.
 */
export function ToggleRow({
  title,
  subtitle,
  selected,
  onPress,
  radius = radii.md,
  minHeight = 56,
  style,
}: ToggleRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.wrap, { borderRadius: radius }, selected && styles.selectedShadow, style]}
    >
      <LinearGradient
        colors={selected ? SELECTED_GRADIENT : UNSELECTED_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.fill,
          {
            borderRadius: radius,
            minHeight,
            borderColor: selected ? SELECTED_BORDER : UNSELECTED_BORDER,
          },
        ]}
      >
        <View style={styles.textCol}>
          <Text style={selected ? styles.titleSelected : styles.titleUnselected}>{title}</Text>
          {subtitle ? (
            <Text style={selected ? styles.subtitleSelected : styles.subtitleUnselected}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <View style={styles.check}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 12l5 5 11-11"
                stroke={colors.white}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        ) : (
          <View style={styles.emptyCircle} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const SELECTED_GRADIENT = ['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.6)'] as const;
const UNSELECTED_GRADIENT = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.16)'] as const;
const SELECTED_BORDER = 'rgba(255,255,255,0.9)';
const UNSELECTED_BORDER = 'rgba(255,255,255,0.55)';

const styles = StyleSheet.create({
  wrap: Platform.select({
    ios: {
      shadowColor: 'rgba(18,42,70,0.14)',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 20,
    },
    default: { elevation: 2 },
  }),
  selectedShadow: Platform.select({
    ios: {
      shadowColor: 'rgba(18,42,70,0.2)',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 1,
      shadowRadius: 28,
    },
    default: { elevation: 5 },
  }),
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
  },
  textCol: {
    flex: 1,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  titleSelected: {
    // Weight 500 at bodyLg size — same "no single token covers this" case as SelectableChip.
    fontFamily: fontFamily.poppins500,
    fontSize: typography.bodyLg.fontSize,
    color: colors.ink,
  },
  titleUnselected: {
    ...textStyle('bodyLg'),
    color: colors.ink60,
  },
  subtitleSelected: {
    ...textStyle('bodySm'),
    color: colors.label,
  },
  subtitleUnselected: {
    ...textStyle('bodySm'),
    color: colors.ink40,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(23,25,29,0.3)',
  },
});
