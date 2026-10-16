import { StyleSheet, Text, View } from 'react-native';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { FITNESS_GOALS, type FitnessGoal } from '@/shared/types/fitnessProfile';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { fitnessGoalLabels } from '@/features/fitness/lib/fitnessChoiceLabels';

type GoalStepProps = {
  value: FitnessGoal | '';
  onChange: (value: FitnessGoal) => void;
};

export function GoalStep({ value, onChange }: GoalStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {FITNESS_GOALS.map((goal) => (
          <SelectableChip
            key={goal}
            label={fitnessGoalLabels[goal]}
            selected={value === goal}
            onPress={() => onChange(goal)}
          />
        ))}
      </View>
      <Text style={styles.footnote}>One goal at a time. We can change it any month.</Text>
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
