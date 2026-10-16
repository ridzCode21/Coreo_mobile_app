import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/features/nutrition/components/MealSheetSubmitButton';
import { PortionSlider } from '@/features/nutrition/components/PortionSlider';
import { scaleLabelServing } from '@/features/nutrition/lib/labelServing';
import { formatMultiplier } from '@/features/nutrition/lib/portionEstimate';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';

type LabelServingsSheetProps = {
  visible: boolean;
  multiplier: number;
  portionGrams: number;
  servingsPerContainer: number;
  perServing: {
    est_calories: number;
    est_protein_g: number;
    est_carbs_g: number;
    est_fat_g: number;
  };
  busy: boolean;
  onMultiplier: (value: number) => void;
  onClose: () => void;
  onSave: () => void;
};

export function LabelServingsSheet({
  visible,
  multiplier,
  portionGrams,
  servingsPerContainer,
  perServing,
  busy,
  onMultiplier,
  onClose,
  onSave,
}: LabelServingsSheetProps) {
  const [liveMultiplier, setLiveMultiplier] = useState({ base: multiplier, value: multiplier });
  const isActiveDrag = liveMultiplier.base === multiplier && liveMultiplier.value !== multiplier;
  const displayMultiplier = liveMultiplier.base === multiplier ? liveMultiplier.value : multiplier;
  const totals = scaleLabelServing(perServing, displayMultiplier);
  const displayProtein = isActiveDrag ? totals.protein_g : Math.round(totals.protein_g);
  const displayCarbs = isActiveDrag ? totals.carbs_g : Math.round(totals.carbs_g);
  const displayFat = isActiveDrag ? totals.fat_g : Math.round(totals.fat_g);

  return (
    <MealSheetSkyFrame
      visible={visible}
      title="How many servings?"
      subtitle={`The container has ${formatMultiplier(servingsPerContainer)} · 1 serving = ${formatMultiplier(portionGrams)}g.`}
      centeredHeader
      onClose={onClose}
    >
      <PortionSlider
        value={multiplier}
        min={1}
        max={servingsPerContainer}
        step={0.1}
        onChange={onMultiplier}
        onLiveChange={(value) => setLiveMultiplier({ base: multiplier, value })}
        accessibilityLabel="Servings multiplier"
        minCaption="0×"
        maxCaption={`${formatMultiplier(servingsPerContainer)}× · whole container`}
      />
      <Text style={styles.total}>
        {totals.calories} kcal · {displayProtein}g protein · {displayCarbs}g carbs · {displayFat}g
        fat
      </Text>
      <Text style={styles.note}>Scales straight off the label, no estimating</Text>
      <MealSheetSubmitButton
        label="Save serving"
        busy={busy}
        onPress={onSave}
        style={styles.submit}
      />
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  total: {
    ...textStyle('bodySm'),
    color: colors.ink65,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  note: {
    ...textStyle('legal'),
    color: colors.ink50,
    marginTop: spacing.dockItemGap,
    textAlign: 'center',
  },
  submit: { marginTop: spacing.sheetTitleGap },
});
