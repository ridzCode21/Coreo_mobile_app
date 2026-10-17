import { StyleSheet, TextInput } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

export const NIGHTS_PLACEHOLDER =
  'In bed by 11:30 but on the phone till 1... then wide awake at 4 thinking about work...';

type NightsStepProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NightsStep({ value, onChange }: NightsStepProps) {
  return (
    <GlassCard variant="night" radius={radii.ml} padded={false}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={NIGHTS_PLACEHOLDER}
        placeholderTextColor={colors.usualOnNightMuted}
        accessibilityLabel="Nights note"
        multiline
        style={styles.input}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  input: {
    ...textStyle('body'),
    color: colors.onNight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
