import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

type NextBarProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * The plain "continue" footer used on onboarding steps that don't offer a free-text/voice
 * alternative — chip-select, slider, and toggle-row screens. `VoiceInputBar` is the sibling
 * footer for steps where typed/voice input is the primary way to answer. Feature-local (not
 * promoted to shared) since it's a simple variant of the same glass-pill shell, only used inside
 * onboarding step footers so far.
 */
export function NextBar({ label, onPress, disabled = false, style }: NextBarProps) {
  return (
    <GlassCard variant="night" radius={radii.pill} padded={false} style={style}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.row, disabled && styles.disabled]}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iconButton}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12h14M13 6l6 6-6 6"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...textStyle('body'),
    fontSize: 13.5,
    color: colors.onNight,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
