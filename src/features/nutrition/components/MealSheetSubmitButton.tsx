import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type MealSheetSubmitButtonProps = {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function MealSheetSubmitButton({
  label,
  busy,
  disabled = busy,
  onPress,
  style,
}: MealSheetSubmitButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.button, style, disabled && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: componentSizes.sheetControlHeight,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    ...textStyle('buttonSm'),
    color: colors.white,
  },
  disabled: {
    opacity: 0.46,
  },
});
