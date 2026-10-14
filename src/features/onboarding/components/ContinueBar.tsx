import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type ContinueBarProps = {
  onPress: () => void;
  disabled?: boolean;
};

/** Solid primary action used by the design's About-you step. */
export function ContinueBar({ onPress, disabled = false }: ContinueBarProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Continue"
      accessibilityState={{ disabled }}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.label}>Continue</Text>
      <Svg
        width={componentSizes.onboardingArrowIcon}
        height={componentSizes.onboardingArrowIcon}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M5 12h14M13 6l6 6-6 6"
          stroke={colors.onNight}
          strokeWidth={componentSizes.onboardingArrowStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: componentSizes.onboardingContinueHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...textStyle('button'),
    color: colors.onNight,
  },
});
