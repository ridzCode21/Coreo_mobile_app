import { StyleSheet, TextInput } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

export const MOVEMENT_PLACEHOLDER =
  'Desk job, walk the dog twice a day, gym maybe twice when work is calm, cricket on Sundays...';

type MovementStepProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MovementStep({ value, onChange }: MovementStepProps) {
  return (
    <GlassCard variant="night" radius={radii.ml} padded={false}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={MOVEMENT_PLACEHOLDER}
        placeholderTextColor={colors.usualOnNightMuted}
        accessibilityLabel="Movement note"
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
