import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { todayISO, useCreateFoodEntryMutation } from '@/features/nutrition/api/nutritionApi';
import {
  AfterSnapBackIcon,
  AfterSnapCheckIcon,
} from '@/features/nutrition/components/AfterSnapIcons';
import { LabelServingsSheet } from '@/features/nutrition/components/LabelServingsSheet';
import {
  clampServingsMultiplier,
  formatLabelPortionLine,
  formatServingsLabel,
  roundGram,
  scaleLabelServing,
} from '@/features/nutrition/lib/labelServing';
import { formatMultiplier } from '@/features/nutrition/lib/portionEstimate';
import {
  labelResultPrefillSchema,
  labelResultRouteParamsSchema,
  type LabelResultPrefill,
} from '@/features/nutrition/schemas';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

const STEPPER_BACKGROUND = withAlpha(colors.white, 0.7);
const STEPPER_BORDER = withAlpha(colors.white, 0.8);

function parsePrefill(raw?: string): LabelResultPrefill | null {
  if (!raw) return null;
  try {
    return labelResultPrefillSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

type MacroRowProps = {
  name: 'Protein' | 'Carbs' | 'Fat';
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

function MacroRow({ name, value, onDecrease, onIncrease }: MacroRowProps) {
  const accessibleName = name.toLowerCase();
  return (
    <GlassCard variant="afterSnapSurface" radius={radii.md} padded={false}>
      <View style={styles.macroRow}>
        <View style={styles.macroCopy}>
          <Text style={styles.macroTitle}>{name}</Text>
          <Text style={styles.macroSubtitle}>{formatMultiplier(value)}g per serving</Text>
        </View>
        <View style={styles.steppers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${accessibleName} servings`}
            onPress={onDecrease}
            style={styles.stepper}
          >
            <Text style={styles.stepperText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${accessibleName} servings`}
            onPress={onIncrease}
            style={styles.stepper}
          >
            <Text style={styles.stepperText}>+</Text>
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

export default function LabelResultScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ prefill?: string }>();
  const routeParams = labelResultRouteParamsSchema.safeParse(rawParams);
  const estimate = parsePrefill(routeParams.success ? routeParams.data.prefill : undefined);
  const createEntry = useCreateFoodEntryMutation(todayISO());
  const [multiplier, setMultiplier] = useState(1);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!estimate) {
    return (
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <Screen background="transparent">
          <Text style={styles.routeError}>I couldn&apos;t open that label result.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Diet"
            onPress={() => router.replace('/diet')}
            style={styles.errorAction}
          >
            <Text style={styles.errorActionText}>Back to Diet</Text>
          </Pressable>
        </Screen>
      </View>
    );
  }

  const servingsPerContainer = estimate.servings_per_container;
  const effectiveServingsPerContainer = servingsPerContainer ?? 1;
  const setClampedMultiplier = (value: number) => {
    setMultiplier(clampServingsMultiplier(roundGram(value), effectiveServingsPerContainer));
  };
  const adjustMultiplier = (delta: number) => setClampedMultiplier(multiplier + delta);
  const totals = scaleLabelServing(estimate, multiplier);

  const submit = () => {
    setSubmitError(null);
    createEntry.mutate(
      {
        food_name: estimate.name,
        meal_type: 'snack',
        portion_g: roundGram(estimate.portion_grams * multiplier),
        ...totals,
        source: 'label_ocr',
      },
      {
        onSuccess: () => router.replace('/diet'),
        onError: () => setSubmitError("That didn't save — check your connection and try again."),
      },
    );
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/diet')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <LinearGradient
              colors={glass.afterSnapNav.gradient}
              start={glass.afterSnapNav.start}
              end={glass.afterSnapNav.end}
              style={styles.backButtonFill}
            >
              <AfterSnapBackIcon />
            </LinearGradient>
          </Pressable>
          <Text style={styles.eyebrow}>Label · Snack</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.headline}>
          Read it straight off the panel. <Text style={styles.headlineAccent}>Check it.</Text>
        </Text>

        <GlassCard
          variant="dietHero"
          radius={radii.xl}
          style={styles.summary}
          contentPaddingVertical={spacing.sheetTitleGap}
          contentPaddingHorizontal={spacing.xl}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.product}>{estimate.name}</Text>
            <View style={styles.calories}>
              <Text style={styles.calorieNumber}>{formatMultiplier(estimate.est_calories)}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          </View>
          <Text style={styles.portionLine}>
            {formatLabelPortionLine({
              servingSizeText: estimate.serving_size_text,
              portionGrams: estimate.portion_grams,
              servingsPerContainer,
            })}
          </Text>
        </GlassCard>

        {servingsPerContainer !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`How much did you eat? ${formatServingsLabel(multiplier)}`}
            onPress={() => setSheetVisible(true)}
          >
            <GlassCard
              variant="afterSnapSurface"
              radius={radii.md}
              padded={false}
              style={styles.servingsCard}
            >
              <View style={styles.servingsRow}>
                <View style={styles.servingsCopy}>
                  <Text style={styles.macroTitle}>How much did you eat?</Text>
                  <Text style={styles.macroSubtitle}>
                    Container has {formatMultiplier(servingsPerContainer)} servings · defaults to 1
                  </Text>
                </View>
                <View style={styles.servingsChip}>
                  <Text style={styles.servingsChipText}>{formatServingsLabel(multiplier)}</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ) : null}

        <View style={styles.macros}>
          <MacroRow
            name="Protein"
            value={estimate.est_protein_g}
            onDecrease={() => adjustMultiplier(-0.1)}
            onIncrease={() => adjustMultiplier(0.1)}
          />
          <MacroRow
            name="Carbs"
            value={estimate.est_carbs_g}
            onDecrease={() => adjustMultiplier(-0.1)}
            onIncrease={() => adjustMultiplier(0.1)}
          />
          <MacroRow
            name="Fat"
            value={estimate.est_fat_g}
            onDecrease={() => adjustMultiplier(-0.1)}
            onIncrease={() => adjustMultiplier(0.1)}
          />
        </View>

        <Text style={styles.scopeNote}>
          Sodium, fiber, sugar aren&apos;t tracked in v1 — calories, protein, carbs, fat only.
        </Text>
        {estimate.guessed ? (
          <Text style={styles.guessNote}>Couldn&apos;t read it clearly. Check the numbers.</Text>
        ) : null}
        <Text style={styles.reassurance}>
          Correct me once. I never make the same mistake twice.
        </Text>
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={createEntry.isPending}
          accessibilityRole="button"
          accessibilityLabel="Looks right"
          accessibilityState={{ disabled: createEntry.isPending }}
          style={styles.submitGlow}
        >
          <LinearGradient
            colors={glass.chipSelected.gradient}
            start={glass.chipSelected.start}
            end={glass.chipSelected.end}
            style={styles.submit}
          >
            <Text style={styles.submitText}>Looks right</Text>
            <View style={styles.submitCheck}>
              {createEntry.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <AfterSnapCheckIcon size={componentSizes.mealReviewCheckIcon} />
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Screen>

      {servingsPerContainer !== null ? (
        <LabelServingsSheet
          visible={sheetVisible}
          multiplier={multiplier}
          portionGrams={estimate.portion_grams}
          servingsPerContainer={servingsPerContainer}
          perServing={estimate}
          busy={false}
          onMultiplier={setClampedMultiplier}
          onClose={() => setSheetVisible(false)}
          onSave={() => setSheetVisible(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    borderRadius: radii.pill,
    height: componentSizes.mealReviewBackControl,
    overflow: 'hidden',
    width: componentSizes.mealReviewBackControl,
  },
  backButtonFill: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerSpacer: { width: componentSizes.mealReviewBackControl },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  headline: {
    ...textStyle('labelResultHeadline'),
    color: colors.ink,
    marginTop: spacing.sheetTitleGap,
  },
  headlineAccent: { ...textStyle('labelResultHeadlineAccent') },
  summary: { marginTop: spacing.ml },
  summaryHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  product: { ...textStyle('mealReviewSummaryTitle'), color: colors.onNight, flex: 1 },
  calories: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.xs },
  calorieNumber: { ...textStyle('mealReviewSummaryValue'), color: colors.onNight },
  calorieUnit: { ...textStyle('cardHint'), color: colors.fog },
  portionLine: { ...textStyle('cardHint'), color: colors.fog, marginTop: spacing.xs },
  servingsCard: { marginTop: spacing.md },
  servingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mealReviewRowPaddingY,
  },
  servingsCopy: { flex: 1 },
  servingsChip: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: componentSizes.afterSnapGuessActionHeight,
    paddingHorizontal: spacing.ml,
  },
  servingsChipText: { ...textStyle('mealReviewFix'), color: colors.white },
  macros: { gap: spacing.sm, marginTop: spacing.md },
  macroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mealReviewRowPaddingY,
  },
  macroCopy: { flex: 1 },
  macroTitle: { ...textStyle('mealReviewRowTitle'), color: colors.ink },
  macroSubtitle: { ...textStyle('cardHint'), color: colors.ink50 },
  steppers: { flexDirection: 'row', gap: spacing.sm },
  stepper: {
    alignItems: 'center',
    backgroundColor: STEPPER_BACKGROUND,
    borderColor: STEPPER_BORDER,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    height: componentSizes.mealReviewStepper,
    justifyContent: 'center',
    width: componentSizes.mealReviewStepper,
  },
  stepperText: { ...textStyle('bodyLg'), color: colors.ink70 },
  scopeNote: {
    ...textStyle('cardHint'),
    color: colors.ink50,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  guessNote: {
    ...textStyle('cardHint'),
    color: colors.ink50,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  reassurance: {
    ...textStyle('legal'),
    color: colors.ink55,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  submitError: {
    ...textStyle('bodySm'),
    color: colors.attention,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  submitGlow: { marginTop: 'auto', paddingTop: spacing.ml },
  submit: {
    alignItems: 'center',
    borderRadius: radii.dietLogPill,
    flexDirection: 'row',
    height: componentSizes.afterSnapResultActionHeight,
    justifyContent: 'space-between',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  submitText: { ...textStyle('buttonSm'), color: colors.ink },
  submitCheck: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    height: componentSizes.mealReviewCheckCircle,
    justifyContent: 'center',
    width: componentSizes.mealReviewCheckCircle,
  },
  routeError: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
    marginTop: spacing.xxxl,
    textAlign: 'center',
  },
  errorAction: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    minHeight: componentSizes.minimumTapTarget,
    justifyContent: 'center',
  },
  errorActionText: { ...textStyle('linkMd'), color: colors.ink70, textDecorationLine: 'underline' },
});
