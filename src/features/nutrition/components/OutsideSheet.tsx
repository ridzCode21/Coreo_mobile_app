import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { MealSheetSelectableChip } from '@/features/nutrition/components/MealSheetSelectableChip';
import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/features/nutrition/components/MealSheetSubmitButton';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { MealType } from '@/shared/types/food';

type OutsideSheetProps = {
  visible: boolean;
  mealType: MealType;
  description: string;
  calories: number;
  busy: boolean;
  onDescription: (value: string) => void;
  onCalories: (value: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const CALORIE_CHIPS = [300, 500, 700] as const;

export function OutsideSheet({
  visible,
  mealType,
  description,
  calories,
  busy,
  onDescription,
  onCalories,
  onClose,
  onSubmit,
}: OutsideSheetProps) {
  const descriptionInput = useRef<TextInput>(null);
  const disabled = busy || !description.trim();
  const buttonLabel = `Log it — that's ${mealType}`;

  return (
    <MealSheetSkyFrame
      visible={visible}
      title="Ate something else?"
      subtitle="No plan needed — I'll still count it."
      onClose={onClose}
    >
      <GlassCard variant="night" radius={radii.pill} padded={false} style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            ref={descriptionInput}
            value={description}
            onChangeText={onDescription}
            placeholder="e.g. leftover pizza, two slices"
            placeholderTextColor={withAlpha(colors.fog, 0.55)}
            accessibilityLabel="What did you eat?"
            returnKeyType="done"
            onSubmitEditing={disabled ? undefined : onSubmit}
            style={styles.input}
          />
          <Pressable
            onPress={() => descriptionInput.current?.focus()}
            hitSlop={spacing.xs}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
            style={styles.voiceButton}
          >
            <Svg
              width={componentSizes.sheetVoiceIcon}
              height={componentSizes.sheetVoiceIcon}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Rect
                x={9}
                y={3}
                width={6}
                height={11}
                rx={3}
                stroke={colors.ink}
                strokeWidth={1.8}
              />
              <Path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke={colors.ink}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </GlassCard>

      <Text style={styles.sectionLabel}>About how much?</Text>
      <View style={styles.chipRow}>
        {CALORIE_CHIPS.map((calorieValue) => (
          <View key={calorieValue} style={styles.chipCell}>
            <MealSheetSelectableChip
              label={`~${calorieValue}`}
              selected={calories === calorieValue}
              onPress={() => onCalories(calorieValue)}
            />
          </View>
        ))}
      </View>

      <MealSheetSubmitButton
        label={buttonLabel}
        busy={busy}
        disabled={disabled}
        onPress={onSubmit}
      />
      <Text style={styles.note}>Carbs and fat default to zero unless you tell me more.</Text>
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  inputCard: {
    marginTop: spacing.lg,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.ms,
    height: componentSizes.sheetControlHeight,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
  },
  input: {
    ...textStyle('small'),
    color: colors.onNight,
    flex: 1,
    padding: 0,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    height: componentSizes.sheetVoiceButton,
    justifyContent: 'center',
    width: componentSizes.sheetVoiceButton,
  },
  sectionLabel: {
    ...textStyle('micro'),
    color: colors.ink45,
    marginTop: spacing.ml,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chipCell: {
    flex: 1,
  },
  note: {
    ...textStyle('legal'),
    color: colors.ink45,
    marginTop: spacing.ms,
    textAlign: 'center',
  },
});
