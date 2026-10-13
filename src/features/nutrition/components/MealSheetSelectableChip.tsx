import { StyleSheet } from 'react-native';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { componentSizes, spacing } from '@/shared/theme/tokens';

type MealSheetSelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function MealSheetSelectableChip({
  label,
  selected,
  onPress,
}: MealSheetSelectableChipProps) {
  return (
    <SelectableChip
      label={label}
      selected={selected}
      onPress={onPress}
      style={styles.chip}
      variant="sheet"
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.sheetChipHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    width: '100%',
  },
});
