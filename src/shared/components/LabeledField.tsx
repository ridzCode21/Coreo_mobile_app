import { StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

type LabeledFieldProps = Pick<
  TextInputProps,
  | 'accessibilityLabel'
  | 'autoCapitalize'
  | 'keyboardType'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'value'
> & {
  label: string;
};

export function LabeledField({ label, accessibilityLabel, ...inputProps }: LabeledFieldProps) {
  return (
    <GlassCard
      variant="light"
      radius={radii.control}
      contentPaddingVertical={spacing.fieldPadY}
      contentPaddingHorizontal={spacing.fieldPadX}
    >
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={colors.ink75}
        style={styles.input}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: {
    ...textStyle('micro'),
    color: colors.ink40,
  },
  input: {
    ...textStyle('body'),
    color: colors.ink75,
    padding: 0,
    marginTop: spacing.xs,
  },
});
