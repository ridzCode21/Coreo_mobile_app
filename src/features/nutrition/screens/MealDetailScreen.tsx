import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
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
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import type {
  FeedbackType,
  PlannedMeal,
  ReplacePreviewAlternative,
} from '@/shared/types/mealPlan';

type Sheet = 'portion' | 'replace' | 'feedback' | 'outside' | null;

const MEAL_LABEL: Record<PlannedMeal['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const PORTIONS = [
  { label: 'Less', value: 0.75 },
  { label: 'As planned', value: 1 },
  { label: 'More', value: 1.25 },
  { label: 'Double', value: 1.5 },
];

const FEEDBACK_OPTIONS: { label: string; value: FeedbackType }[] = [
  { label: 'Loved it', value: 'like' },
  { label: 'Not for me', value: 'dislike' },
  { label: 'Too heavy', value: 'too_heavy' },
  { label: 'Too light', value: 'too_light' },
  { label: 'Too much cooking', value: 'too_much_cooking' },
  { label: 'Too expensive', value: 'too_expensive' },
  { label: "Couldn't find items", value: 'not_available' },
  { label: 'Something else', value: 'other' },
];

const CALORIE_CHIPS = [300, 500, 700];

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
  const params = useLocalSearchParams<{ id?: string }>();
  const date = todayISO();
  const mealId = Number(params.id);
  const planQuery = useMealPlanQuery(date);
  const meal = useMemo(
    () => planQuery.data?.meals.find((item) => item.id === mealId),
    [mealId, planQuery.data?.meals],
  );

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

  const closeSheet = () => {
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
      { onSuccess: () => showSaved('Portion updated and logged.') },
    );
  };

  const previewReplacement = () => {
    if (!meal) return;
    setChosenReplacement(0);
    replacePreview.mutate({ mealId: meal.id, preference: replacePreference });
  };

  const confirmReplacement = () => {
    if (!meal || !replacePreview.data) return;
    replaceConfirm.mutate(
      {
        mealId: meal.id,
        preview_token: replacePreview.data.preview_token,
        chosen_index: chosenReplacement,
      },
      { onSuccess: () => showSaved('Swapped. Your plan has the new meal.') },
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
      {
        meal_type: meal.meal_type,
        planned_meal_id: meal.id,
        description: outsideDescription.trim(),
        approx_calories: outsideCalories,
        approx_protein_g: Math.max(0, Math.round(outsideCalories * 0.08)),
      },
      { onSuccess: () => showSaved('Logged. I adjusted what is left today.') },
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.zenith, colors.day, colors.air]}
        style={StyleSheet.absoluteFill}
      />
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
              <Text style={styles.heroLabel}>{MEAL_LABEL[meal.meal_type]}</Text>
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
            </GlassCard>

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
              <ActionButton label="Portion" onPress={() => setSheet('portion')} disabled={busy} />
              <ActionButton label="Replace" onPress={() => setSheet('replace')} disabled={busy} />
              <ActionButton label="Skip" onPress={skip} disabled={busy || meal.status !== 'planned'} />
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

      <PortionSheet
        visible={sheet === 'portion'}
        portion={portion}
        busy={adjustMeal.isPending}
        onPortion={setPortion}
        onClose={closeSheet}
        onSubmit={savePortion}
      />
      <ReplaceSheet
        visible={sheet === 'replace'}
        preference={replacePreference}
        chosen={chosenReplacement}
        alternatives={replacePreview.data?.alternatives ?? []}
        quotaError={replaceQuota}
        busy={replacePreview.isPending || replaceConfirm.isPending}
        previewed={Boolean(replacePreview.data)}
        onPreference={setReplacePreference}
        onChosen={setChosenReplacement}
        onClose={closeSheet}
        onPreview={previewReplacement}
        onConfirm={confirmReplacement}
      />
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
      <OutsideSheet
        visible={sheet === 'outside'}
        description={outsideDescription}
        calories={outsideCalories}
        busy={ateSomethingElse.isPending}
        onDescription={setOutsideDescription}
        onCalories={setOutsideCalories}
        onClose={closeSheet}
        onSubmit={logOutside}
      />
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

function SheetFrame({
  visible,
  title,
  body,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  body?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {body ? <Text style={styles.sheetBody}>{body}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function PortionSheet({
  visible,
  portion,
  busy,
  onPortion,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  portion: number;
  busy: boolean;
  onPortion: (value: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <SheetFrame
      visible={visible}
      title="How much did you have?"
      body="Update the portion and I will log the adjusted meal."
      onClose={onClose}
    >
      <View style={styles.chipRow}>
        {PORTIONS.map((item) => (
          <SelectableChip
            key={item.value}
            label={item.label}
            selected={portion === item.value}
            onPress={() => onPortion(item.value)}
          />
        ))}
      </View>
      <SheetButton label="Save portion" busy={busy} onPress={onSubmit} />
    </SheetFrame>
  );
}

function ReplaceSheet({
  visible,
  preference,
  chosen,
  alternatives,
  quotaError,
  busy,
  previewed,
  onPreference,
  onChosen,
  onClose,
  onPreview,
  onConfirm,
}: {
  visible: boolean;
  preference: string;
  chosen: number;
  alternatives: ReplacePreviewAlternative[];
  quotaError: ReturnType<typeof quotaErrorFrom>;
  busy: boolean;
  previewed: boolean;
  onPreference: (value: string) => void;
  onChosen: (value: number) => void;
  onClose: () => void;
  onPreview: () => void;
  onConfirm: () => void;
}) {
  return (
    <SheetFrame
      visible={visible}
      title="Swap this meal"
      body="Tell me what would fit better, or leave it open."
      onClose={onClose}
    >
      <TextInput
        value={preference}
        onChangeText={onPreference}
        placeholder="e.g. no dairy, less cooking, more protein"
        placeholderTextColor={colors.ink40}
        style={styles.input}
      />
      {quotaError ? <QuotaBanner error={quotaError} /> : null}
      {alternatives.length > 0 ? (
        <View style={styles.replacementList}>
          {alternatives.map((item, index) => (
            <Pressable
              key={`${item.name}-${index}`}
              onPress={() => onChosen(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen === index }}
              style={[
                styles.replacementRow,
                chosen === index && styles.replacementRowSelected,
              ]}
            >
              <Text style={styles.replacementName}>{item.name}</Text>
              <Text style={styles.replacementMeta}>
                {item.calories_kcal} kcal · {Math.round(item.protein_g)}g protein
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <SheetButton
        label={previewed ? 'Use this swap' : 'Show swaps'}
        busy={busy}
        onPress={previewed ? onConfirm : onPreview}
      />
    </SheetFrame>
  );
}

function FeedbackSheet({
  visible,
  value,
  note,
  busy,
  onValue,
  onNote,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  value: FeedbackType;
  note: string;
  busy: boolean;
  onValue: (value: FeedbackType) => void;
  onNote: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <SheetFrame visible={visible} title="How did this land?" onClose={onClose}>
      <View style={styles.chipRow}>
        {FEEDBACK_OPTIONS.map((item) => (
          <SelectableChip
            key={item.value}
            label={item.label}
            selected={value === item.value}
            onPress={() => onValue(item.value)}
          />
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={onNote}
        placeholder="Optional note"
        placeholderTextColor={colors.ink40}
        style={styles.input}
      />
      <SheetButton label="Save feedback" busy={busy} onPress={onSubmit} />
    </SheetFrame>
  );
}

function OutsideSheet({
  visible,
  description,
  calories,
  busy,
  onDescription,
  onCalories,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  description: string;
  calories: number;
  busy: boolean;
  onDescription: (value: string) => void;
  onCalories: (value: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <SheetFrame
      visible={visible}
      title="Ate something else?"
      body="No problem. Give me a quick estimate and I will adjust the rest of today."
      onClose={onClose}
    >
      <TextInput
        value={description}
        onChangeText={onDescription}
        placeholder="What did you have?"
        placeholderTextColor="rgba(239,244,249,0.58)"
        style={styles.darkInput}
      />
      <View style={styles.chipRow}>
        {CALORIE_CHIPS.map((value) => (
          <SelectableChip
            key={value}
            label={`~${value} kcal`}
            selected={calories === value}
            onPress={() => onCalories(value)}
          />
        ))}
      </View>
      <SheetButton
        label="Log it"
        busy={busy}
        disabled={!description.trim()}
        onPress={onSubmit}
      />
    </SheetFrame>
  );
}

function SheetButton({
  label,
  busy,
  disabled = false,
  onPress,
}: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.sheetButtonWrap}
    >
      <LinearGradient
        colors={[colors.coreBlue, colors.coreBlueDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.sheetButton, (busy || disabled) && styles.disabled]}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.sheetButtonText}>{label}</Text>
        )}
      </LinearGradient>
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
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderColor: 'rgba(255,255,255,0.7)',
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
  heroLabel: {
    ...textStyle('label'),
    color: 'rgba(239,244,249,0.72)',
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyle('questionTitle'),
    color: colors.onNight,
    marginBottom: spacing.md,
  },
  heroBody: {
    ...textStyle('body'),
    color: 'rgba(239,244,249,0.78)',
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
    color: 'rgba(239,244,249,0.65)',
    marginTop: spacing.xs,
  },
  statusText: {
    ...textStyle('caption'),
    color: 'rgba(239,244,249,0.72)',
    marginTop: spacing.lg,
    textTransform: 'capitalize',
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
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderColor: 'rgba(255,255,255,0.68)',
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
    borderBottomColor: 'rgba(255,255,255,0.46)',
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
    color: colors.ink60,
    textAlign: 'right',
  },
  recipeSpinner: {
    marginVertical: spacing.xl,
  },
  recipeNote: {
    ...textStyle('body'),
    color: colors.ink60,
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
    color: colors.ink60,
  },
  backdrop: {
    backgroundColor: 'rgba(21,39,65,0.42)',
    flex: 1,
  },
  sheetWrap: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sheet: {
    backgroundColor: colors.day,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.screenPadX,
    paddingTop: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: 'rgba(23,25,29,0.22)',
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.xl,
    width: 46,
  },
  sheetTitle: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  sheetBody: {
    ...textStyle('body'),
    color: colors.ink60,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    ...textStyle('bodyLg'),
    backgroundColor: 'rgba(255,255,255,0.44)',
    borderColor: 'rgba(255,255,255,0.74)',
    borderRadius: radii.xl,
    borderWidth: 1,
    color: colors.ink,
    marginBottom: spacing.lg,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  darkInput: {
    ...textStyle('bodyLg'),
    backgroundColor: 'rgba(21,39,65,0.76)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.xl,
    borderWidth: 1,
    color: colors.onNight,
    marginBottom: spacing.lg,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  replacementList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  replacementRow: {
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderColor: 'rgba(255,255,255,0.64)',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  replacementRowSelected: {
    backgroundColor: colors.white,
  },
  replacementName: {
    ...textStyle('bodyLg'),
    color: colors.ink,
  },
  replacementMeta: {
    ...textStyle('caption'),
    color: colors.ink60,
    marginTop: spacing.xs,
  },
  sheetButtonWrap: {
    marginTop: spacing.sm,
  },
  sheetButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheetButtonText: {
    ...textStyle('bodyLg'),
    color: colors.white,
  },
});
