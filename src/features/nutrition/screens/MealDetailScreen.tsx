import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

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
import {
  useAdjustMealQuantityMutation,
  useLogPlannedMealMutation,
  useMealFeedbackMutation,
  useMealPlanQuery,
  useMealRecipeQuery,
  useReplaceConfirmMutation,
  useReplacePreviewMutation,
  useSkipPlannedMealMutation,
} from '@/features/nutrition/api/mealPlanApi';
import { todayISO } from '@/features/nutrition/api/nutritionApi';
import { FeedbackSheet } from '@/features/nutrition/components/FeedbackSheet';
import { PortionSheet } from '@/features/nutrition/components/PortionSheet';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { ReplaceCompareScreen } from '@/features/nutrition/components/ReplaceCompareScreen';
import { ReplaceConfirmSheet } from '@/features/nutrition/components/ReplaceConfirmSheet';
import { ReplacePromptSheet } from '@/features/nutrition/components/ReplacePromptSheet';
import { costTierLabel, recipeRefusedFrom } from '@/features/nutrition/lib/mealDetail';
import { MEAL_LABEL, mealTimeLabel } from '@/features/nutrition/lib/mealClock';
import { resolvePortionBase } from '@/features/nutrition/lib/portionEstimate';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import {
  PREVIEW_TTL_MS,
  previewNotFoundFrom,
  serviceUnavailableFrom,
} from '@/features/nutrition/lib/replacePreview';
import { replacedFromParamSchema, type ReplacedFromParam } from '@/features/nutrition/schemas';
import type { FeedbackType, PlannedMeal } from '@/shared/types/mealPlan';

type Sheet = 'portion' | 'replace' | 'feedback' | null;
type ReplaceStep = 'prompt' | 'compare' | 'confirm';

function detailFallback(meal: PlannedMeal | undefined): string {
  if (!meal) return 'Meal';
  return mealTimeLabel(meal.meal_type, meal.scheduled_time);
}

export default function MealDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; replacedFrom?: string }>();
  const date = todayISO();
  const mealId = Number(params.id);
  const planQuery = useMealPlanQuery(date);
  const meal = useMemo(
    () => planQuery.data?.meals.find((item) => item.id === mealId),
    [mealId, planQuery.data?.meals],
  );
  const portionBase = useMemo(() => (meal ? resolvePortionBase(meal) : null), [meal]);

  const [requestedRecipeMealId, setRequestedRecipeMealId] = useState<number | null>(null);
  const recipeRequested = requestedRecipeMealId === mealId;
  const recipeQuery = useMealRecipeQuery(
    date,
    mealId,
    Number.isFinite(mealId) && Boolean(meal) && recipeRequested,
  );
  const logMeal = useLogPlannedMealMutation(date);
  const skipMeal = useSkipPlannedMealMutation(date);
  const adjustMeal = useAdjustMealQuantityMutation(date);
  const feedback = useMealFeedbackMutation(date);
  const replacePreview = useReplacePreviewMutation(date);
  const replaceConfirm = useReplaceConfirmMutation(date);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [portion, setPortion] = useState(1);
  const [replacePreference, setReplacePreference] = useState('');
  const [chosenReplacement, setChosenReplacement] = useState(0);
  const [replaceStep, setReplaceStep] = useState<ReplaceStep>('prompt');
  const [replaceExpiresAt, setReplaceExpiresAt] = useState(0);
  const [replaceError, setReplaceError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('like');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const busy =
    logMeal.isPending ||
    skipMeal.isPending ||
    adjustMeal.isPending ||
    feedback.isPending ||
    replacePreview.isPending ||
    replaceConfirm.isPending;

  const recipeQuota = quotaErrorFrom(recipeQuery.error);
  const recipeRefused = recipeRefusedFrom(recipeQuery.error);
  const replaceQuota = quotaErrorFrom(replacePreview.error);
  const replacedFrom = useMemo<ReplacedFromParam | null>(() => {
    if (!params.replacedFrom) return null;
    try {
      const parsed = replacedFromParamSchema.safeParse(JSON.parse(params.replacedFrom));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [params.replacedFrom]);

  const resetReplace = () => {
    setReplacePreference('');
    setChosenReplacement(0);
    setReplaceStep('prompt');
    setReplaceExpiresAt(0);
    setReplaceError(false);
    replacePreview.reset();
    replaceConfirm.reset();
  };

  const closeSheet = () => {
    if (sheet === 'replace') resetReplace();
    setSheet(null);
    setStatusMessage(null);
  };

  const showSaved = (message: string) => {
    closeSheet();
    setStatusMessage(message);
  };

  const logAsPlanned = () => {
    if (!meal) return;
    logMeal.mutate(
      { mealId: meal.id },
      { onSuccess: () => setStatusMessage('Logged. Today stays in sync.') },
    );
  };

  const skip = () => {
    if (!meal) return;
    skipMeal.mutate(meal.id, {
      onSuccess: () => setStatusMessage("Skipped. I'll remember that for the day."),
    });
  };

  const savePortion = () => {
    if (!meal) return;
    adjustMeal.mutate(
      { mealId: meal.id, portion_multiplier: portion },
      { onSuccess: () => showSaved("Portion updated. Today's macros reflect it.") },
    );
  };

  const previewReplacement = (preference = replacePreference) => {
    if (!meal) return;
    setChosenReplacement(0);
    setReplaceError(false);
    setReplaceExpiresAt(Date.now() + PREVIEW_TTL_MS);
    replacePreview.mutate(
      { mealId: meal.id, preference },
      { onSuccess: () => setReplaceExpiresAt(Date.now() + PREVIEW_TTL_MS) },
    );
  };

  const openReplace = () => {
    resetReplace();
    setSheet('replace');
    previewReplacement('');
  };

  const confirmReplacement = () => {
    if (!meal || !replacePreview.data?.preview_token) return;
    replaceConfirm.mutate(
      {
        mealId: meal.id,
        preview_token: replacePreview.data.preview_token,
        chosen_index: chosenReplacement,
      },
      {
        onSuccess: (response) => {
          if (!response.meal_id) return;
          const snapshot: ReplacedFromParam = {
            name: meal.name,
            calories_kcal: meal.calories_kcal,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fat_g: meal.fat_g,
          };
          resetReplace();
          setSheet(null);
          router.replace(
            `/diet/meal/${response.meal_id}?replacedFrom=${encodeURIComponent(JSON.stringify(snapshot))}`,
          );
        },
        onError: (error) => {
          if (previewNotFoundFrom(error)) {
            replacePreview.reset();
            replaceConfirm.reset();
            setReplaceStep('prompt');
            previewReplacement(replacePreference);
            return;
          }
          setReplaceError(true);
        },
      },
    );
  };

  const submitFeedback = () => {
    if (!meal) return;
    feedback.mutate(
      { mealId: meal.id, feedback_type: feedbackType, note: feedbackNote.trim() || undefined },
      { onSuccess: () => showSaved('Noted. Future plans will use that.') },
    );
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.eyebrow}>{detailFallback(meal)}</Text>
          <View style={styles.backPlaceholder} />
        </View>

        {planQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : planQuery.isError ? (
          <GlassCard variant="light" radius={radii.mealDetailCard} style={styles.infoCard}>
            <Text style={styles.emptyTitle}>Couldn&apos;t load this meal</Text>
            <Text style={styles.mutedText}>Go back and try opening it again.</Text>
          </GlassCard>
        ) : meal ? (
          <>
            {meal.replacement_of_id === null ? (
              <>
                <Text style={styles.title}>{meal.name}</Text>
                <View style={styles.chipRow}>
                  {meal.prep_time_minutes !== null ? (
                    <InfoChip label={`${meal.prep_time_minutes} min`} />
                  ) : null}
                  <InfoChip label={costTierLabel(meal.estimated_cost_tier)} />
                  {meal.serving_size ? <InfoChip label={meal.serving_size} /> : null}
                </View>
                <GlassCard
                  variant="dietHero"
                  radius={radii.md}
                  style={styles.heroStrip}
                  contentPaddingVertical={spacing.planMealRowPaddingY}
                  contentPaddingHorizontal={spacing.lg}
                >
                  <View style={styles.heroStripRow}>
                    <View style={styles.calorieGroup}>
                      <Text style={styles.calorieValue}>{Math.round(meal.calories_kcal)}</Text>
                      <Text style={styles.calorieUnit}>kcal</Text>
                    </View>
                    <Text style={styles.macroLine}>
                      P {Math.round(meal.protein_g)}g · C {Math.round(meal.carbs_g)}g · F{' '}
                      {Math.round(meal.fat_g)}g
                    </Text>
                  </View>
                </GlassCard>
              </>
            ) : (
              <GlassCard variant="night" radius={radii.xl} style={styles.hero}>
                <View style={styles.heroHeading}>
                  <Text style={styles.heroLabel}>{MEAL_LABEL[meal.meal_type]}</Text>
                  <View style={styles.replacedBadge}>
                    <Text style={styles.replacedBadgeText}>Replaced</Text>
                  </View>
                </View>
                <Text style={styles.receiptTitle}>{meal.name}</Text>
                <Text style={styles.receiptMacros}>
                  {Math.round(meal.calories_kcal)} kcal · P {Math.round(meal.protein_g)}g · C{' '}
                  {Math.round(meal.carbs_g)}g · F {Math.round(meal.fat_g)}g
                </Text>
              </GlassCard>
            )}

            {meal.replacement_of_id !== null && replacedFrom ? (
              <>
                <GlassCard variant="chip" radius={radii.sm} style={styles.replacedNotice}>
                  <Text style={styles.replacedNoticeText}>
                    Replaced <Text style={styles.replacedOriginalName}>{replacedFrom.name}</Text> —
                    swapped for a closer macro match.
                  </Text>
                  {showOriginal ? (
                    <Text style={styles.originalMacros}>
                      {replacedFrom.name} · {Math.round(replacedFrom.calories_kcal)} kcal · P{' '}
                      {Math.round(replacedFrom.protein_g)}g · C {Math.round(replacedFrom.carbs_g)}g
                      · F {Math.round(replacedFrom.fat_g)}g
                    </Text>
                  ) : null}
                </GlassCard>
                <Pressable
                  onPress={() => setShowOriginal((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel="View the original"
                  style={styles.originalLink}
                >
                  <Text style={styles.originalLinkText}>View the original</Text>
                </Pressable>
              </>
            ) : null}

            {statusMessage ? (
              <GlassCard variant="light" radius={radii.lg} style={styles.notice}>
                <Text style={styles.noticeText}>{statusMessage}</Text>
              </GlassCard>
            ) : null}

            <Text style={styles.sectionLabel}>Ingredients</Text>
            <GlassCard
              variant="light"
              radius={radii.mealDetailCard}
              style={styles.ingredientsCard}
              contentPaddingVertical={spacing.xs}
              contentPaddingHorizontal={spacing.lg}
            >
              {meal.ingredients_json.map((item, index) => (
                <View
                  key={`${item.name}-${item.quantity}`}
                  style={[
                    styles.ingredientRow,
                    index === meal.ingredients_json.length - 1 && styles.ingredientRowLast,
                  ]}
                >
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientQty}>{item.quantity}</Text>
                </View>
              ))}
            </GlassCard>

            {!recipeRequested ? (
              <View style={styles.recipeTeaser}>
                <Text style={styles.recipeTeaserText}>Recipe ready in a few short steps.</Text>
                <Pressable
                  onPress={() => setRequestedRecipeMealId(meal.id)}
                  accessibilityRole="button"
                  accessibilityLabel="View recipe"
                  style={styles.recipeLink}
                >
                  <Text style={styles.recipeLinkText}>View recipe</Text>
                </Pressable>
              </View>
            ) : recipeQuery.isLoading ? (
              <ActivityIndicator color={colors.ink45} style={styles.recipeSpinner} />
            ) : recipeRefused ? (
              <GlassCard
                variant="light"
                radius={radii.mealDetailCard}
                style={styles.recipeCard}
                contentPaddingVertical={spacing.md}
                contentPaddingHorizontal={spacing.lg}
              >
                <Text style={styles.refusedTitle}>{recipeRefused.title}</Text>
                <Text style={styles.refusedMessage}>{recipeRefused.message}</Text>
              </GlassCard>
            ) : recipeQuota ? (
              <QuotaBanner error={recipeQuota} />
            ) : recipeQuery.data ? (
              <GlassCard
                variant="light"
                radius={radii.mealDetailCard}
                style={styles.recipeCard}
                contentPaddingVertical={spacing.md}
                contentPaddingHorizontal={spacing.lg}
              >
                <Text style={styles.recipeNote}>{recipeQuery.data.nutrition_note}</Text>
                {recipeQuery.data.steps.map((step) => (
                  <View key={step.step} style={styles.stepRow}>
                    <Text style={styles.stepNumber}>{step.step}</Text>
                    <Text style={styles.stepText}>{step.instruction}</Text>
                  </View>
                ))}
              </GlassCard>
            ) : (
              <Text style={styles.mutedText}>Recipe could not be loaded. Try again later.</Text>
            )}

            <View style={styles.actionGrid}>
              <ActionButton
                label="Log"
                onPress={logAsPlanned}
                disabled={busy || meal.status !== 'planned'}
                primary
                loading={logMeal.isPending}
              />
              <ActionButton
                label="Skip"
                onPress={skip}
                disabled={busy || meal.status !== 'planned'}
              />
              <ActionButton
                label="Adjust"
                onPress={() => {
                  setPortion(meal.portion_multiplier);
                  setSheet('portion');
                }}
                disabled={busy}
              />
              <ActionButton label="Replace" onPress={openReplace} disabled={busy} />
              <ActionButton label="Feedback" onPress={() => setSheet('feedback')} disabled={busy} />
            </View>
          </>
        ) : (
          <GlassCard variant="light" radius={radii.lg} style={styles.infoCard}>
            <Text style={styles.emptyTitle}>Meal not found</Text>
            <Text style={styles.mutedText}>
              This item may have been replaced. Go back to today&apos;s plan for the latest meals.
            </Text>
          </GlassCard>
        )}
      </Screen>

      {portionBase ? (
        <PortionSheet
          visible={sheet === 'portion'}
          multiplier={portion}
          baseMacros={portionBase}
          busy={adjustMeal.isPending}
          onMultiplier={setPortion}
          onClose={closeSheet}
          onSubmit={savePortion}
        />
      ) : null}
      <ReplacePromptSheet
        visible={sheet === 'replace' && replaceStep === 'prompt'}
        preference={replacePreference}
        alternatives={replacePreview.data?.alternatives ?? null}
        quotaError={replaceQuota}
        serviceUnavailable={serviceUnavailableFrom(replacePreview.error)}
        loading={replacePreview.isPending}
        onPreference={setReplacePreference}
        onClose={closeSheet}
        onSubmit={() => previewReplacement()}
        onPick={(index) => {
          setChosenReplacement(index);
          setReplaceStep('compare');
        }}
      />
      <ReplaceCompareScreen
        visible={sheet === 'replace' && replaceStep === 'compare'}
        alternatives={replacePreview.data?.alternatives ?? []}
        selectedIndex={chosenReplacement}
        onBack={() => setReplaceStep('prompt')}
        onUseThisOne={(index) => {
          setChosenReplacement(index);
          setReplaceStep('confirm');
        }}
      />
      {meal && replacePreview.data?.alternatives[chosenReplacement] ? (
        <ReplaceConfirmSheet
          visible={sheet === 'replace' && replaceStep === 'confirm'}
          mealTypeLabel={MEAL_LABEL[meal.meal_type].toLowerCase()}
          original={meal}
          alternative={replacePreview.data.alternatives[chosenReplacement]}
          expiresAt={replaceExpiresAt}
          busy={replaceConfirm.isPending}
          error={replaceError}
          onChooseDifferent={() => setReplaceStep('compare')}
          onTryAgain={() => {
            setReplaceStep('prompt');
            previewReplacement(replacePreference);
          }}
          onConfirm={confirmReplacement}
        />
      ) : null}
      <FeedbackSheet
        visible={sheet === 'feedback'}
        value={feedbackType}
        note={feedbackNote}
        busy={feedback.isPending}
        onValue={setFeedbackType}
        onNote={setFeedbackNote}
        onClose={closeSheet}
        onSubmit={submitFeedback}
      />
    </View>
  );
}

function InfoChip({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipText}>{label}</Text>
    </View>
  );
}

type ActionLabel = 'Log' | 'Skip' | 'Adjust' | 'Replace' | 'Feedback';

function ActionButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  loading = false,
}: {
  label: ActionLabel;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.actionWrap, disabled && styles.disabled]}
    >
      {primary ? (
        <View style={[styles.actionTile, styles.primaryAction]}>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <ActionIcon label={label} />
              <Text style={[styles.actionText, styles.primaryText]}>{label}</Text>
            </>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={glass.planRowPlanned.gradient}
          start={glass.planRowPlanned.start}
          end={glass.planRowPlanned.end}
          style={styles.actionTile}
        >
          <ActionIcon label={label} />
          <Text style={styles.actionText}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function ActionIcon({ label }: { label: ActionLabel }) {
  if (label === 'Adjust') {
    return (
      <Svg
        width={componentSizes.mealDetailActionIcon}
        height={componentSizes.mealDetailActionIcon}
        viewBox="0 0 24 24"
      >
        <Circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke={colors.ink}
          strokeWidth={componentSizes.mealDetailActionStrokeWidth}
        />
        <Path
          d="M12 1v4M12 19v4M1 12h4M19 12h4"
          stroke={colors.ink}
          strokeWidth={componentSizes.mealDetailActionStrokeWidth}
        />
      </Svg>
    );
  }
  const path = {
    Log: 'M20 6L9 17l-5-5',
    Skip: 'M18 4v16M6 4l12 8-12 8V4z',
    Replace: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0020.5 15',
    Feedback: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  }[label];
  return (
    <Svg
      width={componentSizes.mealDetailActionIcon}
      height={componentSizes.mealDetailActionIcon}
      viewBox="0 0 24 24"
    >
      <Path
        d={path}
        fill="none"
        stroke={colors.ink}
        strokeWidth={
          label === 'Log'
            ? componentSizes.mealDetailPrimaryStrokeWidth
            : componentSizes.mealDetailActionStrokeWidth
        }
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.ml,
  },
  back: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.42),
    borderColor: withAlpha(colors.white, 0.7),
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    height: componentSizes.dietHeaderControl,
    justifyContent: 'center',
    width: componentSizes.dietHeaderControl,
  },
  backPlaceholder: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  backText: {
    ...textStyle('cardValue'),
    color: colors.ink,
  },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    flex: 1,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    minHeight: componentSizes.planFailedMessageMaxWidth,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroLabel: {
    ...textStyle('label'),
    color: withAlpha(colors.fog, 0.72),
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyle('mealDetailTitle'),
    color: colors.ink,
    marginBottom: spacing.sliderCaptionGap,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sliderCaptionGap,
  },
  infoChip: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.5),
    borderColor: withAlpha(colors.white, 0.65),
    borderRadius: radii.mealDetailChip,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    minHeight: componentSizes.mealDetailChipHeight,
    paddingHorizontal: spacing.md,
  },
  infoChipText: {
    ...textStyle('mealDetailChip'),
    color: colors.ink62,
  },
  heroStrip: {
    marginBottom: spacing.ml,
    marginTop: spacing.md,
  },
  heroStripRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calorieGroup: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sliderCaptionGap },
  calorieValue: {
    ...textStyle('mealDetailCalories'),
    color: colors.onNight,
  },
  calorieUnit: {
    ...textStyle('mealDetailMacro'),
    color: withAlpha(colors.fog, 0.55),
  },
  macroLine: {
    ...textStyle('mealDetailMacro'),
    color: withAlpha(colors.fog, 0.6),
  },
  replacedBadge: {
    backgroundColor: withAlpha(colors.white, 0.18),
    borderRadius: radii.pill,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.xs,
  },
  replacedBadgeText: {
    ...textStyle('micro'),
    color: colors.onNight,
    textTransform: 'none',
  },
  receiptTitle: {
    ...textStyle('replaceReceiptTitle'),
    color: colors.onNight,
    marginTop: spacing.sm,
  },
  receiptMacros: {
    ...textStyle('replaceReceiptMacros'),
    color: withAlpha(colors.fog, 0.6),
    marginTop: spacing.sliderCaptionGap,
  },
  replacedNotice: {
    marginBottom: spacing.md,
  },
  replacedNoticeText: {
    ...textStyle('caption'),
    color: colors.ink70,
  },
  replacedOriginalName: {
    ...textStyle('caption'),
    color: colors.ink,
  },
  originalMacros: {
    ...textStyle('legal'),
    color: colors.ink55,
    marginTop: spacing.sm,
  },
  originalLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
    marginBottom: spacing.lg,
  },
  originalLinkText: {
    ...textStyle('caption'),
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  notice: {
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...textStyle('body'),
    color: colors.success,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  actionWrap: {
    flexBasis: '30%',
  },
  actionTile: {
    alignItems: 'center',
    borderColor: glass.planRowPlanned.border,
    borderRadius: radii.control,
    borderWidth: componentSizes.hairline,
    gap: spacing.sliderCaptionGap,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    width: '100%',
  },
  primaryAction: {
    backgroundColor: colors.white,
    borderColor: colors.white,
    elevation: componentSizes.dietElevation,
    shadowColor: colors.mealDetailActionShadow,
    shadowOffset: { width: 0, height: spacing.ms },
    shadowOpacity: 1,
    shadowRadius: componentSizes.planActionShadowRadius,
  },
  actionText: {
    ...textStyle('mealDetailAction'),
    color: colors.ink75,
  },
  primaryText: {
    ...textStyle('mealDetailAction'),
    color: colors.ink,
    fontFamily: textStyle('label').fontFamily,
  },
  disabled: {
    opacity: 0.46,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...textStyle('mealDetailSectionLabel'),
    color: colors.ink45,
    marginBottom: spacing.sliderCaptionGap,
  },
  ingredientsCard: { marginBottom: 0 },
  ingredientRow: {
    alignItems: 'center',
    borderBottomColor: withAlpha(colors.white, 0.46),
    borderBottomWidth: componentSizes.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  ingredientRowLast: { borderBottomWidth: 0 },
  ingredientName: {
    ...textStyle('mealDetailIngredient'),
    color: colors.ink,
    flex: 1,
    paddingRight: spacing.md,
  },
  ingredientQty: {
    ...textStyle('mealDetailIngredient'),
    color: colors.ink50,
    textAlign: 'right',
  },
  recipeSpinner: {
    marginVertical: spacing.ml,
  },
  recipeTeaser: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  recipeTeaserText: { ...textStyle('linkSm'), color: colors.ink55 },
  recipeLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
    paddingLeft: spacing.md,
  },
  recipeLinkText: {
    ...textStyle('linkSm'),
    color: colors.ink,
    fontFamily: textStyle('label').fontFamily,
    textDecorationLine: 'underline',
  },
  recipeCard: { marginTop: spacing.md },
  refusedTitle: { ...textStyle('mealDetailRefusedTitle'), color: colors.ink },
  refusedMessage: {
    ...textStyle('caption'),
    color: colors.ink62,
    marginTop: spacing.xs,
  },
  recipeNote: {
    ...textStyle('body'),
    color: colors.ink62,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    ...textStyle('caption'),
    color: colors.ink45,
    width: componentSizes.mealDetailStepNumberWidth,
  },
  stepText: {
    ...textStyle('body'),
    color: colors.ink,
    flex: 1,
  },
  emptyTitle: {
    ...textStyle('cardValue'),
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  mutedText: {
    ...textStyle('body'),
    color: colors.ink62,
  },
});
