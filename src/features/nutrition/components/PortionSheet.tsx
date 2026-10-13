import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/features/nutrition/components/MealSheetSubmitButton';
import { PortionSlider } from '@/features/nutrition/components/PortionSlider';
import {
  computePortionEstimate,
  formatMultiplier,
  MIN_PORTION_MULTIPLIER,
  type PortionMacros,
} from '@/features/nutrition/lib/portionEstimate';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

type PortionSheetProps = {
  visible: boolean;
  multiplier: number;
  baseMacros: PortionMacros;
  busy: boolean;
  onMultiplier: (value: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function PortionSheet({
  visible,
  multiplier,
  baseMacros,
  busy,
  onMultiplier,
  onClose,
  onSubmit,
}: PortionSheetProps) {
  const [inputValue, setInputValue] = useState(() => formatMultiplier(multiplier));
  const [inputValid, setInputValid] = useState(Number.isFinite(multiplier));
  const [displayMultiplier, setDisplayMultiplier] = useState(multiplier);
  const lastTypedNumber = useRef<number | null>(null);
  const wasVisible = useRef(visible);
  const estimate = computePortionEstimate(baseMacros, displayMultiplier);

  useEffect(() => {
    const justOpened = visible && !wasVisible.current;
    wasVisible.current = visible;

    if (justOpened || lastTypedNumber.current !== multiplier) {
      setInputValue(formatMultiplier(multiplier));
      setInputValid(Number.isFinite(multiplier));
      setDisplayMultiplier(multiplier);
      lastTypedNumber.current = null;
    }
  }, [multiplier, visible]);

  const changeInput = (text: string) => {
    setInputValue(text);
    const trimmed = text.trim();
    const parsed = Number(trimmed);
    const valid = trimmed.length > 0 && Number.isFinite(parsed);
    setInputValid(valid);

    if (valid) {
      lastTypedNumber.current = parsed;
      setDisplayMultiplier(parsed);
      onMultiplier(parsed);
    } else {
      lastTypedNumber.current = null;
    }
  };

  const changeSliderDisplay = (value: number) => {
    setDisplayMultiplier(value);
    setInputValue(formatMultiplier(value));
    setInputValid(true);
    lastTypedNumber.current = null;
  };

  const disabled =
    busy || !inputValid || !Number.isFinite(multiplier) || multiplier < MIN_PORTION_MULTIPLIER;

  return (
    <MealSheetSkyFrame
      visible={visible}
      title="Adjust the portion"
      subtitle="Same meal — half, double, or any amount you like."
      centeredHeader
      onClose={onClose}
    >
      <PortionSlider
        value={multiplier}
        min={0.25}
        max={3}
        onChange={onMultiplier}
        onLiveChange={changeSliderDisplay}
      />
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Or type your own amount</Text>
        <View style={styles.inputValueRow}>
          <TextInput
            value={inputValue}
            onChangeText={changeInput}
            keyboardType="decimal-pad"
            accessibilityLabel="Custom portion multiplier"
            selectTextOnFocus
            style={styles.input}
          />
          <Text style={styles.inputSuffix}>×</Text>
        </View>
      </View>
      <Text style={styles.estimate}>
        About {estimate.calories_kcal} kcal · roughly {estimate.protein_g}g protein,{' '}
        {estimate.carbs_g}g carbs, {estimate.fat_g}g fat
      </Text>
      <MealSheetSubmitButton
        label="Save portion"
        busy={busy}
        disabled={disabled}
        onPress={onSubmit}
        style={styles.submitButton}
      />
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.5),
    borderColor: withAlpha(colors.white, 0.65),
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.ml,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.ms,
  },
  inputLabel: {
    ...textStyle('caption'),
    color: colors.ink60,
    flex: 1,
  },
  inputValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    ...textStyle('buttonSm'),
    color: colors.ink,
    minWidth: spacing.xxxl,
    padding: 0,
    textAlign: 'right',
  },
  inputSuffix: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink50,
  },
  estimate: {
    ...textStyle('portionEstimate'),
    color: colors.ink70,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.sheetTitleGap,
  },
});
