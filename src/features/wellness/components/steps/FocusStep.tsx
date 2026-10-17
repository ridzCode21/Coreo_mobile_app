import { StyleSheet, Text, View } from 'react-native';

import { wellnessFocusLabels } from '@/features/wellness/lib/wellnessChoiceLabels';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { WELLNESS_FOCUS, type WellnessFocus } from '@/shared/types/wellnessProfile';

type FocusStepProps = {
  value: WellnessFocus | '';
  onChange: (value: WellnessFocus) => void;
};

export function FocusStep({ value, onChange }: FocusStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {WELLNESS_FOCUS.map((focus) => (
          <SelectableChip
            key={focus}
            label={wellnessFocusLabels[focus]}
            selected={value === focus}
            onPress={() => onChange(focus)}
          />
        ))}
      </View>
      <Text style={styles.footnote}>
        Sleep, stress, mood, energy. It all belongs here. We just start with the heaviest.
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
