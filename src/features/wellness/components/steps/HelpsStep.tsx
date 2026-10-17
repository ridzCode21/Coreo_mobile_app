import { StyleSheet, Text, View } from 'react-native';

import { whatHelpsLabels } from '@/features/wellness/lib/wellnessChoiceLabels';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { WHAT_HELPS, toggleExclusiveChoice, type WhatHelps } from '@/shared/types/wellnessProfile';

type HelpsStepProps = {
  value: WhatHelps[];
  onChange: (value: WhatHelps[]) => void;
};

export function HelpsStep({ value, onChange }: HelpsStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {WHAT_HELPS.map((choice) => (
          <SelectableChip
            key={choice}
            label={whatHelpsLabels[choice]}
            selected={value.includes(choice)}
            onPress={() =>
              onChange(toggleExclusiveChoice(value, choice, 'havent_found_it') as WhatHelps[])
            }
          />
        ))}
      </View>
      <Text style={styles.footnote}>No mandatory meditation. Your unwind can be a walk.</Text>
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
