import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import {
  useAdjustMealQuantityMutation,
  useAteSomethingElseMutation,
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
import { OutsideSheet } from '@/features/nutrition/components/OutsideSheet';
import { PortionSheet } from '@/features/nutrition/components/PortionSheet';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { ReplaceCompareScreen } from '@/features/nutrition/components/ReplaceCompareScreen';
import { ReplaceConfirmSheet } from '@/features/nutrition/components/ReplaceConfirmSheet';
import { ReplacePromptSheet } from '@/features/nutrition/components/ReplacePromptSheet';
import { buildAteSomethingElsePayload } from '@/features/nutrition/lib/ateSomethingElsePayload';
import { resolvePortionBase } from '@/features/nutrition/lib/portionEstimate';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import {
  PREVIEW_TTL_MS,
  previewNotFoundFrom,
  serviceUnavailableFrom,
} from '@/features/nutrition/lib/replacePreview';
import { replacedFromParamSchema, type ReplacedFromParam } from '@/features/nutrition/schemas';
import type { FeedbackType, PlannedMeal } from '@/shared/types/mealPlan';

type Sheet = 'portion' | 'replace' | 'feedback' | 'outside' | null;
type ReplaceStep = 'prompt' | 'compare' | 'confirm';

const MEAL_LABEL: Record<PlannedMeal['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

function mealStatusCopy(status: PlannedMeal['status']): string {
  if (status === 'logged_as_planned') return 'Logged as planned';
  if (status === 'logged_modified') return 'Logged with edits';
  if (status === 'eaten_outside') return 'Logged outside';
  return status.replaceAll('_', ' ');
}

function detailFallback(meal: PlannedMeal | undefined): string {
  if (!meal) return 'Meal';
  return `${MEAL_LABEL[meal.meal_type]} · ${meal.calories_kcal} kcal`;
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

  const recipeQuery = useMealRecipeQuery(date, mealId, Number.isFinite(mealId) && Boolean(meal));
  const logMeal = useLogPlannedMealMutation(date);
  const skipMeal = useSkipPlannedMealMutation(date);
  const adjustMeal = useAdjustMealQuantityMutation(date);
  const feedback = useMealFeedbackMutation(date);
  const replacePreview = useReplacePreviewMutation(date);
  const replaceConfirm = useReplaceConfirmMutation(date);
  const ateSomethingElse = useAteSomethingElseMutation(date);

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
  const [outsideDescription, setOutsideDescription] = useState('');
  const [outsideCalories, setOutsideCalories] = useState(500);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const busy =
    logMeal.isPending ||
    skipMeal.isPending ||
    adjustMeal.isPending ||
    feedback.isPending ||
    replacePreview.isPending ||
    replaceConfirm.isPending ||
    ateSomethingElse.isPending;

  const recipeQuota = quotaErrorFrom(recipeQuery.error);
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

  const logOutside = () => {
    if (!meal || !outsideDescription.trim()) return;
    ateSomethingElse.mutate(
      buildAteSomethingElsePayload(meal, outsideDescription, outsideCalories),
      { onSuccess: () => showSaved('Logged. I adjusted what is left today.') },
    );
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.eyebrow}>{detailFallback(meal)}</Text>
          <View style={styles.back} />
        </View>

        {planQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : meal ? (
          <>
            <GlassCard variant="night" radius={radii.xl} style={styles.hero}>
              <View style={styles.heroHeading}>
                <Text style={styles.heroLabel}>{MEAL_LABEL[meal.meal_type]}</Text>
                {meal.replacement_of_id !== null ? (
                  <View style={styles.replacedBadge}>
                    <Text style={styles.replacedBadgeText}>Replaced</Text>
                  </View>
                ) : null}
              </View>
              {meal.replacement_of_id !== null ? (
                <>
                  <Text style={styles.receiptTitle}>{meal.name}</Text>
                  <Text style={styles.receiptMacros}>
                    {Math.round(meal.calories_kcal)} kcal · P {Math.round(meal.protein_g)}g · C{' '}
                    {Math.round(meal.carbs_g)}g · F {Math.round(meal.fat_g)}g
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.title}>{meal.name}</Text>
                  <Text style={styles.heroBody}>{meal.rationale}</Text>
                  <View style={styles.heroMetrics}>
                    <Metric label="kcal" value={String(meal.calories_kcal)} dark />
                    <Metric label="protein" value={`${Math.round(meal.protein_g)}g`} dark />
                    <Metric label="carbs" value={`${Math.round(meal.carbs_g)}g`} dark />
                    <Metric label="fat" value={`${Math.round(meal.fat_g)}g`} dark />
                  </View>
                  <Text style={styles.statusText}>
                    {mealStatusCopy(meal.status)} · {meal.serving_size}
                  </Text>
                </>
              )}
            </GlassCard>

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

            <View style={styles.actionGrid}>
              <Pressable
                onPress={logAsPlanned}
                disabled={busy || meal.status !== 'planned'}
                accessibilityRole="button"
                accessibilityLabel="Log meal as planned"
                style={styles.primaryWrap}
              >
                <LinearGradient
                  colors={[colors.coreBlue, colors.coreBlueDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.primaryAction,
                    (busy || meal.status !== 'planned') && styles.disabled,
                  ]}
                >
                  {logMeal.isPending ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryText}>Log as planned</Text>
                  )}
                </LinearGradient>
              </Pressable>
              <ActionButton
                label="Portion"
                onPress={() => {
                  setPortion(meal.portion_multiplier);
                  setSheet('portion');
                }}
                disabled={busy}
              />
              <ActionButton label="Replace" onPress={openReplace} disabled={busy} />
              <ActionButton
                label="Skip"
                onPress={skip}
                disabled={busy || meal.status !== 'planned'}
              />
              <ActionButton
                label="Ate else"
                onPress={() => setSheet('outside')}
                disabled={busy || meal.status !== 'planned'}
              />
              <ActionButton label="Feedback" onPress={() => setSheet('feedback')} disabled={busy} />
            </View>

            <GlassCard variant="light" radius={radii.lg} style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Ingredients</Text>
              {meal.ingredients_json.map((item) => (
                <View key={`${item.name}-${item.quantity}`} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientQty}>{item.quantity}</Text>
                </View>
              ))}
            </GlassCard>

            <GlassCard variant="light" radius={radii.lg} style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Recipe</Text>
              {recipeQuery.isLoading ? (
                <ActivityIndicator color={colors.ink45} style={styles.recipeSpinner} />
              ) : recipeQuota ? (
                <QuotaBanner error={recipeQuota} />
              ) : recipeQuery.data ? (
                <>
                  <Text style={styles.recipeNote}>{recipeQuery.data.note}</Text>
                  {recipeQuery.data.steps.map((step, index) => (
                    <View key={`${step}-${index}`} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.mutedText}>Recipe will appear here once it is ready.</Text>
              )}
            </GlassCard>
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
      {meal ? (
        <OutsideSheet
          visible={sheet === 'outside'}
          mealType={meal.meal_type}
          description={outsideDescription}
          calories={outsideCalories}
          busy={ateSomethingElse.isPending}
          onDescription={setOutsideDescription}
          onCalories={setOutsideCalories}
          onClose={closeSheet}
          onSubmit={logOutside}
        />
      ) : null}
    </View>
  );
}

function Metric({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={dark ? styles.metricValueDark : styles.metricValue}>{value}</Text>
      <Text style={dark ? styles.metricLabelDark : styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.secondaryAction, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  back: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.42),
    borderColor: withAlpha(colors.white, 0.7),
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    ...textStyle('cardValue'),
    color: colors.ink,
    marginTop: -2,
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
    minHeight: 240,
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
    ...textStyle('questionTitle'),
    color: colors.onNight,
    marginBottom: spacing.md,
  },
  heroBody: {
    ...textStyle('body'),
    color: withAlpha(colors.fog, 0.78),
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  metric: {
    minWidth: 62,
  },
  metricValue: {
    ...textStyle('cardValue'),
    color: colors.ink,
  },
  metricLabel: {
    ...textStyle('caption'),
    color: colors.ink45,
    marginTop: spacing.xs,
  },
  metricValueDark: {
    ...textStyle('cardValue'),
    color: colors.onNight,
  },
  metricLabelDark: {
    ...textStyle('caption'),
    color: withAlpha(colors.fog, 0.65),
    marginTop: spacing.xs,
  },
  statusText: {
    ...textStyle('caption'),
    color: withAlpha(colors.fog, 0.72),
    marginTop: spacing.lg,
    textTransform: 'capitalize',
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
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryWrap: {
    minWidth: '100%',
  },
  primaryAction: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryText: {
    ...textStyle('bodyLg'),
    color: colors.white,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.42),
    borderColor: withAlpha(colors.white, 0.68),
    borderRadius: radii.pill,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 48,
    justifyContent: 'center',
    minWidth: '30%',
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    ...textStyle('body'),
    color: colors.ink,
  },
  disabled: {
    opacity: 0.46,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...textStyle('label'),
    color: colors.ink45,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    alignItems: 'center',
    borderBottomColor: withAlpha(colors.white, 0.46),
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  ingredientName: {
    ...textStyle('body'),
    color: colors.ink,
    flex: 1,
    paddingRight: spacing.md,
  },
  ingredientQty: {
    ...textStyle('caption'),
    color: colors.ink62,
    textAlign: 'right',
  },
  recipeSpinner: {
    marginVertical: spacing.xl,
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
    width: 22,
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
