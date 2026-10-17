import { StyleSheet, Text, View } from 'react-native';

import { morningFirstLabels } from '@/features/wellness/lib/wellnessChoiceLabels';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { MORNING_FIRST, type MorningFirst } from '@/shared/types/wellnessProfile';

type MorningStepProps = {
  value: MorningFirst | '';
  onChange: (value: MorningFirst) => void;
};

export function MorningStep({ value, onChange }: MorningStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {MORNING_FIRST.map((choice) => (
          <SelectableChip
            key={choice}
            label={morningFirstLabels[choice]}
            selected={value === choice}
            onPress={() => onChange(choice)}
          />
        ))}
      </View>
      <Text style={styles.footnote}>
        Your first hour sets the day. I work with it, not against it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.ms,
  },
  footnote: { ...textStyle('legal'), color: colors.ink50, textAlign: 'center' },
});
