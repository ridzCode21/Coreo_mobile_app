import { StyleSheet, TextInput, View } from 'react-native';

import { MealSheetSelectableChip } from '@/features/nutrition/components/MealSheetSelectableChip';
import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/features/nutrition/components/MealSheetSubmitButton';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { FeedbackType } from '@/shared/types/mealPlan';

type FeedbackSheetProps = {
  visible: boolean;
  value: FeedbackType;
  note: string;
  busy: boolean;
  onValue: (value: FeedbackType) => void;
  onNote: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const FEEDBACK_OPTIONS: { label: string; value: FeedbackType }[] = [
  { label: 'Loved it', value: 'like' },
  { label: 'Too heavy', value: 'too_heavy' },
  { label: 'Too light', value: 'too_light' },
  { label: 'Too much cooking', value: 'too_much_cooking' },
  { label: 'Too pricey', value: 'too_expensive' },
  { label: 'Not available', value: 'not_available' },
];

export function FeedbackSheet({
  visible,
  value,
  note,
  busy,
  onValue,
  onNote,
  onClose,
  onSubmit,
}: FeedbackSheetProps) {
  return (
    <MealSheetSkyFrame
      visible={visible}
      title="How was it?"
      subtitle="Helps me plan better tomorrow."
      onClose={onClose}
    >
      <View style={styles.chipGrid}>
        {FEEDBACK_OPTIONS.map((item) => (
          <View key={item.value} style={styles.chipCell}>
            <MealSheetSelectableChip
              label={item.label}
              selected={value === item.value}
              onPress={() => onValue(item.value)}
            />
          </View>
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={onNote}
        placeholder="Anything else? Optional."
        placeholderTextColor={colors.ink45}
        accessibilityLabel="Optional feedback note"
        style={styles.input}
      />
      <MealSheetSubmitButton
        label="Send feedback"
        busy={busy}
        onPress={onSubmit}
        style={styles.submitButton}
      />
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chipCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  input: {
    ...textStyle('small'),
    backgroundColor: withAlpha(colors.white, 0.5),
    borderColor: withAlpha(colors.white, 0.65),
    borderRadius: radii.pill,
    borderWidth: 1,
    color: colors.ink,
    marginTop: spacing.ml,
    minHeight: componentSizes.sheetNoteHeight,
    paddingHorizontal: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.ml,
  },
});
