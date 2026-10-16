import { StyleSheet, Text, View } from 'react-native';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import {
  PROTECTED_AREAS,
  toggleExclusiveChoice,
  type ProtectedArea,
} from '@/shared/types/fitnessProfile';
import { protectedAreaLabels } from '@/features/fitness/lib/fitnessChoiceLabels';

type ProtectStepProps = {
  value: ProtectedArea[];
  onChange: (value: ProtectedArea[]) => void;
};

export function ProtectStep({ value, onChange }: ProtectStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {PROTECTED_AREAS.map((area) => (
          <SelectableChip
            key={area}
            label={protectedAreaLabels[area]}
            selected={value.includes(area)}
            onPress={() =>
              onChange(toggleExclusiveChoice(value, area, 'nothing_to_flag') as ProtectedArea[])
            }
          />
        ))}
      </View>
      <Text style={styles.footnote}>Tell me more in your own words anytime, I remember.</Text>
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
