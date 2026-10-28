import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SelectableChip } from '@/shared/components/SelectableChip';
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
import {
  confirmMealSchema,
  confirmPrefillSchema,
  confirmRouteParamsSchema,
  type ConfirmPrefill,
  type PhotoReceiptSummary,
} from '@/features/nutrition/schemas';
import {
  todayISO,
  useCreateFoodEntriesMutation,
  useCreateFoodEntryMutation,
  type CreateFoodEntryInput,
} from '@/features/nutrition/api/nutritionApi';
import { currentMealByClock, MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import { itemToEntry } from '@/features/nutrition/lib/photoResult';
import type { FoodSource, MealType, PhotoEstimateItem } from '@/shared/types/food';

type FormState = {
  food_name: string;
  meal_type: MealType;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

type ReviewItem = {
  original: PhotoEstimateItem;
  name: string;
  multiplier: number;
  editing: boolean;
};

const MEAL_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const NUMERIC_FIELDS: { key: keyof FormState; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

const SUMMARY_LABEL = withAlpha(colors.fog, 0.5);
const SUMMARY_UNIT = withAlpha(colors.fog, 0.55);
const STEPPER_BACKGROUND = withAlpha(colors.white, 0.7);
const STEPPER_BORDER = withAlpha(colors.white, 0.8);
const STEPPER_HIT_SLOP = (componentSizes.minimumTapTarget - componentSizes.mealReviewStepper) / 2;
const STEPPER_HIT_SLOP_INSETS = {
  top: STEPPER_HIT_SLOP,
  right: STEPPER_HIT_SLOP,
  bottom: STEPPER_HIT_SLOP,
  left: STEPPER_HIT_SLOP,
};

function parsePrefill(raw?: string): ConfirmPrefill | null {
  if (!raw) return null;
  try {
    return confirmPrefillSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function scaled(value: number, multiplier: number): number {
  return Math.round(value * multiplier);
}

function nextMultiplier(multiplier: number, direction: -1 | 1): number {
  return Math.max(0.1, Math.round((multiplier + direction * 0.1) * 10) / 10);
}

function BackIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewBackIcon}
      height={componentSizes.mealReviewBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.ink80}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewCheckIcon}
      height={componentSizes.mealReviewCheckIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M20 6L9 17l-5-5"
        stroke={colors.white}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PhotoReviewProps = {
  prefill: ConfirmPrefill & { items: PhotoEstimateItem[] };
  mealType: MealType;
  onBack: () => void;
  onSaved: (summary: PhotoReceiptSummary) => void;
};

function PhotoReview({ prefill, mealType, onBack, onSaved }: PhotoReviewProps) {
  const [items, setItems] = useState<ReviewItem[]>(() =>
    prefill.items.map((item) => ({
      original: item,
      name: item.name,
      multiplier: 1,
      editing: false,
    })),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createEntries = useCreateFoodEntriesMutation(todayISO());

  const updateItem = (index: number, change: (item: ReviewItem) => ReviewItem) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? change(item) : item)),
    );
  };

  const submit = async () => {
    setSubmitError(null);
    if (items.some((item) => item.name.trim().length === 0)) {
      setSubmitError('Give every item a name.');
      return;
    }
    const entries: CreateFoodEntryInput[] = items.map(({ original, name, multiplier }) =>
      itemToEntry(original, mealType, multiplier, name),
    );
    try {
      await createEntries.mutateAsync(entries);
      const savedItems = items.map(({ original, name, multiplier }) => ({
        ...original,
        name: name.trim(),
        portion_grams: scaled(original.portion_grams, multiplier),
        est_calories: scaled(original.est_calories, multiplier),
        est_protein_g: scaled(original.est_protein_g, multiplier),
        est_carbs_g: scaled(original.est_carbs_g, multiplier),
        est_fat_g: scaled(original.est_fat_g, multiplier),
      }));
      onSaved({
        food_name: prefill.food_name ?? savedItems.map((item) => item.name).join(', '),
        meal_type: mealType,
        calories: entries.reduce((total, entry) => total + entry.calories, 0),
        protein_g: entries.reduce((total, entry) => total + entry.protein_g, 0),
        carbs_g: entries.reduce((total, entry) => total + entry.carbs_g, 0),
        fat_g: entries.reduce((total, entry) => total + entry.fat_g, 0),
        items: savedItems,
      });
    } catch {
      setSubmitError("That didn't save — check your connection and try again.");
    }
  };

  return (
    <>
      <View style={styles.reviewHeader}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={spacing.xs}
          style={styles.backButton}
        >
          <LinearGradient
            colors={glass.light.gradient}
            start={glass.light.start}
            end={glass.light.end}
            style={styles.backButtonFill}
          >
            <BackIcon />
          </LinearGradient>
        </Pressable>
        <Text style={styles.reviewEyebrow}>Logged · {MEAL_LABEL[mealType]}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.reviewTitle}>
        {"Here's what I saw. "}
        <Text style={styles.reviewTitleAccent}>Check my math.</Text>
      </Text>

      <GlassCard
        variant="dietHero"
        radius={radii.xl}
        style={styles.reviewSummary}
        contentPaddingVertical={spacing.dietHeroCardPaddingY}
        contentPaddingHorizontal={spacing.dietCardPaddingX}
      >
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>{prefill.food_name}</Text>
          <View style={styles.summaryCalories}>
            <Text style={styles.summaryNumber}>{prefill.calories}</Text>
            <Text style={styles.summaryUnit}>kcal</Text>
          </View>
        </View>
        <Text style={styles.summaryDetail}>
          P {prefill.protein_g}g · C {prefill.carbs_g}g · F {prefill.fat_g}g, every line below is
          editable
        </Text>
      </GlassCard>

      <View style={styles.reviewRows}>
        {items.map((item, index) => {
          const canFix = item.original.guessed || item.original.remembered;
          return (
            <GlassCard
              key={`${item.original.name}-${index}`}
              variant="light"
              radius={radii.md}
              contentPaddingVertical={spacing.mealReviewRowPaddingY}
              contentPaddingHorizontal={spacing.lg}
            >
              <View style={styles.reviewRow}>
                <View style={styles.reviewItemCopy}>
                  {item.editing ? (
                    <TextInput
                      value={item.name}
                      onChangeText={(name) =>
                        updateItem(index, (current) => ({ ...current, name }))
                      }
                      accessibilityLabel={`${item.name} name`}
                      autoFocus
                      style={styles.reviewNameInput}
                    />
                  ) : (
                    <Text style={styles.reviewItemName}>{item.name}</Text>
                  )}
                  <Text style={styles.reviewItemDetail}>
                    {item.original.portion_label ?? '—'} ·{' '}
                    {scaled(item.original.est_calories, item.multiplier)} kcal
                  </Text>
                  {item.original.remembered ? (
                    <Text style={styles.rememberedText}>From your fix last time</Text>
                  ) : null}
                </View>
                <View style={styles.stepperGroup}>
                  <Pressable
                    onPress={() =>
                      updateItem(index, (current) => ({
                        ...current,
                        multiplier: nextMultiplier(current.multiplier, -1),
                      }))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${item.name}`}
                    hitSlop={STEPPER_HIT_SLOP_INSETS}
                    style={styles.stepper}
                  >
                    <Text style={styles.stepperText}>−</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      updateItem(index, (current) => ({
                        ...current,
                        multiplier: nextMultiplier(current.multiplier, 1),
                      }))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${item.name}`}
                    hitSlop={STEPPER_HIT_SLOP_INSETS}
                    style={styles.stepper}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
                {canFix ? (
                  <Pressable
                    onPress={() => updateItem(index, (current) => ({ ...current, editing: true }))}
                    accessibilityRole="button"
                    accessibilityLabel={`Fix ${item.name}`}
                    hitSlop={spacing.sm}
                  >
                    <Text style={styles.fixText}>Fix</Text>
                  </Pressable>
                ) : null}
              </View>
            </GlassCard>
          );
        })}
      </View>

      <Text style={styles.reviewFooter}>Correct me once. I never make the same mistake twice.</Text>
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      <Pressable
        onPress={submit}
        disabled={createEntries.isPending}
        accessibilityRole="button"
        accessibilityLabel="Looks right — log it"
        accessibilityState={{ disabled: createEntries.isPending }}
        style={styles.reviewSubmitGlow}
      >
        <LinearGradient
          colors={glass.chipSelected.gradient}
          start={glass.chipSelected.start}
          end={glass.chipSelected.end}
          style={styles.reviewSubmit}
        >
          <Text style={styles.reviewSubmitText}>Looks right</Text>
          <View style={styles.reviewCheck}>
            {createEntries.isPending ? <ActivityIndicator color={colors.white} /> : <CheckIcon />}
          </View>
        </LinearGradient>
      </Pressable>
    </>
  );
}

export default function ConfirmMealScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ source?: string; prefill?: string }>();
  const params = confirmRouteParamsSchema.parse({
    source: rawParams.source,
    prefill: rawParams.prefill,
  });
  const source = params.source as FoodSource;
  const prefill = parsePrefill(params.prefill);
  const { control, handleSubmit, setError, formState } = useForm<FormState>({
    defaultValues: {
      food_name: prefill?.food_name ?? '',
      meal_type: prefill?.meal_type ?? currentMealByClock(),
      calories: prefill?.calories != null ? String(prefill.calories) : '',
      protein_g: prefill?.protein_g != null ? String(prefill.protein_g) : '',
      carbs_g: prefill?.carbs_g != null ? String(prefill.carbs_g) : '',
      fat_g: prefill?.fat_g != null ? String(prefill.fat_g) : '',
    },
  });
  const selectedMeal = useWatch({ control, name: 'meal_type' });
  const createEntry = useCreateFoodEntryMutation(todayISO());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = (values: FormState) => {
    setSubmitError(null);
    const parsed = confirmMealSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          setError(field as keyof FormState, { message: issue.message });
        }
      }
      return;
    }
    createEntry.mutate(
      { ...parsed.data, source },
      {
        onSuccess: () => router.back(),
        onError: () => setSubmitError("That didn't save — check your connection and try again."),
      },
    );
  };

  const photoPrefill =
    source === 'photo' && prefill?.items?.length ? { ...prefill, items: prefill.items } : null;

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        {photoPrefill ? (
          <PhotoReview
            prefill={photoPrefill}
            mealType={selectedMeal}
            onBack={() => router.back()}
            onSaved={(summary) => {
              const query = new URLSearchParams({ summary: JSON.stringify(summary) });
              router.replace(`/diet/receipt?${query.toString()}`);
            }}
          />
        ) : (
          <>
            <Text style={styles.eyebrow}>Logged · {MEAL_LABEL[selectedMeal]}</Text>
            <Text style={styles.title}>
              {source === 'photo' ? "Here's what I saw. Check my math." : 'Check my math.'}
            </Text>
            <Controller
              control={control}
              name="food_name"
              render={({ field }) => (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>What was it</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="e.g. Rice bowl with paneer"
                    placeholderTextColor={colors.ink40}
                    style={styles.textField}
                  />
                  {formState.errors.food_name ? (
                    <Text style={styles.errorText}>{formState.errors.food_name.message}</Text>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="meal_type"
              render={({ field }) => (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Which meal</Text>
                  <View style={styles.chipRow}>
                    {MEAL_OPTIONS.map((meal) => (
                      <SelectableChip
                        key={meal}
                        label={MEAL_LABEL[meal]}
                        selected={field.value === meal}
                        onPress={() => field.onChange(meal)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />
            <View style={styles.macroGrid}>
              {NUMERIC_FIELDS.map(({ key, label, unit }) => (
                <Controller
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <View style={styles.macroField}>
                      <Text style={styles.fieldLabel}>
                        {label} <Text style={styles.unit}>({unit})</Text>
                      </Text>
                      <TextInput
                        value={field.value}
                        onChangeText={field.onChange}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.ink40}
                        style={styles.textField}
                      />
                      {formState.errors[key] ? (
                        <Text style={styles.errorText}>{formState.errors[key]?.message}</Text>
                      ) : null}
                    </View>
                  )}
                />
              ))}
            </View>
            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={createEntry.isPending}
              accessibilityRole="button"
              accessibilityLabel="Looks right — log it"
              style={styles.primaryWrap}
            >
              <LinearGradient
                colors={[colors.ink, colors.ink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.primary, createEntry.isPending && styles.primaryDisabled]}
              >
                {createEntry.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryText}>Looks right</Text>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={styles.cancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Not now</Text>
            </Pressable>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  eyebrow: { ...textStyle('label'), color: colors.ink45, marginBottom: spacing.sm },
  title: { ...textStyle('questionTitle'), color: colors.ink, marginBottom: spacing.xxl },
  fieldBlock: { marginBottom: spacing.xl, gap: spacing.sm },
  fieldLabel: { ...textStyle('label'), color: colors.label },
  unit: { ...textStyle('caption'), color: colors.ink40 },
  textField: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    backgroundColor: withAlpha(colors.white, 0.5),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.6),
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  macroField: { flexGrow: 1, flexBasis: '45%', gap: spacing.sm },
  errorText: { ...textStyle('caption'), color: colors.attention, textAlign: 'center' },
  primaryWrap: { marginTop: spacing.sm },
  primary: { height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { ...textStyle('bodyLg'), color: colors.white },
  cancel: { alignSelf: 'center', paddingVertical: spacing.lg },
  cancelText: { ...textStyle('body'), color: colors.ink45 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: {
    width: componentSizes.mealReviewBackControl,
    height: componentSizes.mealReviewBackControl,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  backButtonFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reviewEyebrow: { ...textStyle('label'), color: colors.ink45, textAlign: 'center' },
  headerSpacer: { width: componentSizes.mealReviewBackControl },
  reviewTitle: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
    marginTop: spacing.sheetTitleGap,
  },
  reviewTitleAccent: { ...textStyle('dietHeadlineAccent') },
  reviewSummary: { marginTop: spacing.dietHeroTop },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  summaryTitle: { ...textStyle('mealReviewSummaryTitle'), color: colors.onNight, flexShrink: 1 },
  summaryCalories: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  summaryNumber: { ...textStyle('mealReviewSummaryValue'), color: colors.onNight },
  summaryUnit: { ...textStyle('cardHint'), color: SUMMARY_UNIT },
  summaryDetail: { ...textStyle('cardHint'), color: SUMMARY_LABEL, marginTop: spacing.xs },
  reviewRows: { marginTop: spacing.md, gap: spacing.sm },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewItemCopy: { flex: 1 },
  reviewItemName: { ...textStyle('mealReviewRowTitle'), color: colors.ink },
  reviewNameInput: {
    ...textStyle('mealReviewRowTitle'),
    color: colors.ink,
    borderBottomWidth: componentSizes.hairline,
    borderBottomColor: colors.ink45,
    padding: 0,
  },
  reviewItemDetail: { ...textStyle('cardHint'), color: colors.ink50 },
  rememberedText: {
    ...textStyle('fine'),
    color: colors.ink40,
    marginTop: spacing.mealReviewRememberedTop,
  },
  stepperGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: {
    width: componentSizes.mealReviewStepper,
    height: componentSizes.mealReviewStepper,
    borderRadius: radii.pill,
    backgroundColor: STEPPER_BACKGROUND,
    borderWidth: componentSizes.hairline,
    borderColor: STEPPER_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { ...textStyle('bodyLg'), color: colors.ink70 },
  fixText: {
    ...textStyle('mealReviewFix'),
    color: colors.ink50,
    textDecorationLine: 'underline',
  },
  reviewFooter: {
    ...textStyle('legal'),
    color: colors.ink55,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  reviewSubmitGlow: {
    marginTop: spacing.xxxl,
    borderRadius: radii.dietLogPill,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.dietLogPillGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  reviewSubmit: {
    height: componentSizes.dietLogPillHeight,
    borderRadius: radii.dietLogPill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.chipSelected.border,
    paddingLeft: spacing.dietActionPaddingLeft,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewSubmitText: { ...textStyle('buttonSm'), color: colors.ink },
  reviewCheck: {
    width: componentSizes.mealReviewCheckCircle,
    height: componentSizes.mealReviewCheckCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.nightShadow,
        shadowOffset: { width: 0, height: spacing.sm },
        shadowOpacity: 1,
        shadowRadius: componentSizes.dietCircleShadowRadius,
      },
      default: { elevation: componentSizes.dietElevation },
    }),
  } as ViewStyle,
});
