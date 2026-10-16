import { StyleSheet, Text, View } from 'react-native';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { SPORTS, toggleExclusiveChoice, type Sport } from '@/shared/types/fitnessProfile';
import { sportLabels } from '@/features/fitness/lib/fitnessChoiceLabels';

type SportsStepProps = {
  value: Sport[];
  onChange: (value: Sport[]) => void;
};

export function SportsStep({ value, onChange }: SportsStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {SPORTS.map((sport) => (
          <SelectableChip
            key={sport}
            label={sportLabels[sport]}
            selected={value.includes(sport)}
            onPress={() =>
              onChange(toggleExclusiveChoice(value, sport, 'nothing_regular') as Sport[])
            }
          />
        ))}
      </View>
      <Text style={styles.footnote}>
        Match days shape the week. Legs rest before, recovery after.
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
