import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/shared/theme/tokens';

type ProgressDotsProps = {
  /** Total number of steps — the design source uses 8 for onboarding, but this isn't hardcoded. */
  count: number;
  /** 0-indexed. */
  activeIndex: number;
  style?: ViewStyle;
};

/**
 * Step progress indicator for onboarding flows — docs/design-system.md §7. Active segment is a
 * wider glowing white pill; inactive segments are small translucent pills.
 */
export function ProgressDots({ count, activeIndex, style }: ProgressDotsProps) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={index === activeIndex ? styles.active : styles.inactive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  active: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      default: {},
    }),
  },
  inactive: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
