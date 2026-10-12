import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useDietProfileQuery, useUpdateDietProfileMutation } from '@/features/onboarding';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import {
  useMealPlanQuery,
  useRegenerateMealPlanMutation,
} from '@/features/nutrition/api/mealPlanApi';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import { todayISO } from '@/features/nutrition/api/nutritionApi';
import type { BudgetTier, CookingFrequency } from '@/shared/types/dietProfile';
import type { PlannedMeal, RegenerationReason } from '@/shared/types/mealPlan';

const MEAL_LABEL: Record<PlannedMeal['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const REASONS: { label: string; value: RegenerationReason }[] = [
  { label: 'Too boring', value: 'too_boring' },
  { label: 'Too expensive', value: 'too_expensive' },
  { label: 'Too much cooking', value: 'too_much_cooking' },
  { label: "Don't like these foods", value: 'dont_like_foods' },
  { label: 'Need more protein', value: 'need_more_protein' },
  { label: 'Make it lighter', value: 'make_lighter' },
  { label: 'Different cuisine', value: 'different_cuisine' },
  { label: 'Surprise me', value: 'surprise_me' },
];

const BUDGETS: { label: string; value: BudgetTier }[] = [
  { label: 'Budget-friendly', value: 'budget_friendly' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Premium', value: 'premium' },
];

const COOKING: { label: string; value: CookingFrequency }[] = [
  { label: 'Barely any', value: 'minimal_cooking' },
  { label: 'Something simple', value: 'once_daily' },
  { label: 'I like cooking', value: 'every_meal' },
];

function displayNumber(value: number | null | undefined): string {
  return String(Math.round(typeof value === 'number' && Number.isFinite(value) ? value : 0));
}

function statusLabel(status: PlannedMeal['status']): string {
  if (status === 'logged_as_planned') return 'Logged';
  if (status === 'logged_modified') return 'Modified';
  if (status === 'eaten_outside') return 'Outside';
  return status.replaceAll('_', ' ');
}

export default function MealPlanScreen() {
  const router = useRouter();
  const date = todayISO();
  const planQuery = useMealPlanQuery(date);
  const profileQuery = useDietProfileQuery();
  const updateProfile = useUpdateDietProfileMutation();
  const regenerate = useRegenerateMealPlanMutation(date);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<RegenerationReason>('too_boring');
  const [contextAsk, setContextAsk] = useState<'budget' | 'cooking' | null>(null);
  const [budget, setBudget] = useState<BudgetTier>('moderate');
  const [cooking, setCooking] = useState<CookingFrequency>('once_daily');

  const plan = planQuery.data?.status === 'ready' ? planQuery.data : null;
  const failedPlan = planQuery.data?.status === 'failed';
  const quotaError = quotaErrorFrom(regenerate.error);

  const regenerateNow = (selectedReason = reason) => {
    regenerate.mutate(
      { regeneration_reason: selectedReason },
      {
        onSuccess: () => {
          setReasonOpen(false);
          setContextAsk(null);
        },
      },
    );
  };

  const submitReason = () => {
    const profile = profileQuery.data;
    if (reason === 'too_expensive' && !profile?.budget_tier) {
      setContextAsk('budget');
      return;
    }
    if (reason === 'too_much_cooking' && !profile?.cooking_frequency) {
      setContextAsk('cooking');
      return;
    }
    regenerateNow();
  };

  const saveContextAsk = () => {
    const patch =
      contextAsk === 'budget' ? { budget_tier: budget } : { cooking_frequency: cooking };
    updateProfile.mutate(patch, {
      onSuccess: () => regenerateNow(),
    });
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
          <Text style={styles.eyebrow}>Today&apos;s plan</Text>
          <View style={styles.back} />
        </View>

        {planQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : plan ? (
          <>
            {!plan.validation_result.macro_ok ? (
              <GlassCard variant="light" radius={radii.lg} style={styles.warning}>
                <Text style={styles.warningText}>
                  {plan.validation_result.self_check_issues.join(' ') ||
                    'Macros landed a touch off today — still within range.'}
                </Text>
              </GlassCard>
            ) : null}
            <View style={styles.mealList}>
              {plan.meals.map((meal) => {
                const done = meal.status !== 'planned' && meal.status !== 'missed';
                return (
                  <Pressable
                    key={meal.id}
                    onPress={() => router.push(`/diet/meal/${meal.id}` as Href)}
                    accessibilityRole="button"
                    accessibilityLabel={`${MEAL_LABEL[meal.meal_type]} ${meal.name}`}
                    style={[styles.mealRow, done && styles.mealRowDone]}
                  >
                    <View style={styles.mealCopy}>
                      <Text style={done ? styles.mealMetaDone : styles.mealMeta}>
                        {MEAL_LABEL[meal.meal_type]}
                      </Text>
                      <Text style={done ? styles.mealNameDone : styles.mealName}>{meal.name}</Text>
                      <Text style={done ? styles.mealMacrosDone : styles.mealMacros}>
                        {meal.calories_kcal} kcal · {Math.round(meal.protein_g)}g protein
                      </Text>
                    </View>
                    <Text style={done ? styles.statusDone : styles.status}>
                      {statusLabel(meal.status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <GlassCard variant="night" radius={radii.xl} style={styles.totalCard}>
              <Text style={styles.darkLabel}>Day total</Text>
              <View style={styles.totalRow}>
                <Metric label="kcal" value={displayNumber(plan.total_calories)} />
                <Metric label="protein" value={`${displayNumber(plan.total_protein_g)}g`} />
                <Metric label="carbs" value={`${displayNumber(plan.total_carbs_g)}g`} />
                <Metric label="fat" value={`${displayNumber(plan.total_fat_g)}g`} />
              </View>
            </GlassCard>
            {quotaError ? <QuotaBanner error={quotaError} /> : null}
            <Pressable
              onPress={() => setReasonOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Regenerate plan"
              style={styles.regenerate}
            >
              <Text style={styles.regenerateText}>Regenerate plan</Text>
            </Pressable>
          </>
        ) : failedPlan ? (
          <>
            <GlassCard variant="night" radius={radii.xl} style={styles.totalCard}>
              <Text style={styles.darkLabel}>Plan failed</Text>
              <Text style={styles.failedBody}>
                The backend finished without meals for today. Regenerate it and I&apos;ll keep
                watching for the new result.
              </Text>
            </GlassCard>
            {quotaError ? <QuotaBanner error={quotaError} /> : null}
            <Pressable
              onPress={() => regenerateNow('surprise_me')}
              disabled={regenerate.isPending}
              accessibilityRole="button"
              accessibilityLabel="Try generating plan again"
              style={styles.regenerate}
            >
              {regenerate.isPending ? (
                <ActivityIndicator color={colors.ink45} />
              ) : (
                <Text style={styles.regenerateText}>Try again</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Text style={styles.emptyText}>No plan is ready yet. Generate one from Diet.</Text>
        )}
      </Screen>
      <RegenerateSheet
        visible={reasonOpen}
        reason={reason}
        contextAsk={contextAsk}
        budget={budget}
        cooking={cooking}
        saving={regenerate.isPending || updateProfile.isPending}
        onReason={setReason}
        onBudget={setBudget}
        onCooking={setCooking}
        onClose={() => {
          setReasonOpen(false);
          setContextAsk(null);
        }}
        onSubmit={contextAsk ? saveContextAsk : submitReason}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function RegenerateSheet({
  visible,
  reason,
  contextAsk,
  budget,
  cooking,
  saving,
  onReason,
  onBudget,
  onCooking,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  reason: RegenerationReason;
  contextAsk: 'budget' | 'cooking' | null;
  budget: BudgetTier;
  cooking: CookingFrequency;
  saving: boolean;
  onReason: (value: RegenerationReason) => void;
  onBudget: (value: BudgetTier) => void;
  onCooking: (value: CookingFrequency) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>
            {contextAsk === 'budget'
              ? "What's the food budget like?"
              : contextAsk === 'cooking'
                ? 'How much cooking feels doable most days?'
                : "What's not working today?"}
          </Text>
          <Text style={styles.sheetBody}>
            {contextAsk
              ? "This makes future plans fit better. I won't ask again."
              : "Pick one — I'll rebuild around it."}
          </Text>
          <View style={styles.chips}>
            {contextAsk === 'budget'
              ? BUDGETS.map((item) => (
                  <SelectableChip
                    key={item.value}
                    label={item.label}
                    selected={budget === item.value}
                    onPress={() => onBudget(item.value)}
                  />
                ))
              : contextAsk === 'cooking'
                ? COOKING.map((item) => (
                    <SelectableChip
                      key={item.value}
                      label={item.label}
                      selected={cooking === item.value}
                      onPress={() => onCooking(item.value)}
                    />
                  ))
                : REASONS.map((item) => (
                    <SelectableChip
                      key={item.value}
                      label={item.label}
                      selected={reason === item.value}
                      onPress={() => onReason(item.value)}
                    />
                  ))}
          </View>
          <Pressable
            onPress={onSubmit}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={contextAsk ? 'Continue' : 'Regenerate plan'}
            style={styles.sheetPrimary}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.sheetPrimaryText}>
                {contextAsk ? 'Continue' : 'Regenerate plan'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 112 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 28, color: colors.ink, lineHeight: 32 },
  eyebrow: { ...textStyle('label'), color: colors.ink45 },
  loading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  warning: { marginBottom: spacing.lg },
  warningText: { ...textStyle('bodySm'), color: colors.ink60 },
  mealList: { gap: spacing.sm },
  mealRow: {
    minHeight: 82,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mealRowDone: { backgroundColor: colors.ink },
  mealCopy: { flex: 1 },
  mealMeta: { ...textStyle('micro'), color: colors.ink45 },
  mealMetaDone: { ...textStyle('micro'), color: 'rgba(239,244,249,0.55)' },
  mealName: { ...textStyle('bodyLg'), color: colors.ink, marginTop: spacing.xs },
  mealNameDone: { ...textStyle('bodyLg'), color: colors.onNight, marginTop: spacing.xs },
  mealMacros: { ...textStyle('caption'), color: colors.ink60, marginTop: spacing.xs },
  mealMacrosDone: {
    ...textStyle('caption'),
    color: 'rgba(239,244,249,0.62)',
    marginTop: spacing.xs,
  },
  status: { ...textStyle('micro'), color: colors.ink60, textTransform: 'capitalize' },
  statusDone: {
    ...textStyle('micro'),
    color: 'rgba(239,244,249,0.7)',
    textTransform: 'capitalize',
  },
  totalCard: { marginTop: spacing.lg },
  darkLabel: { ...textStyle('label'), color: 'rgba(239,244,249,0.55)' },
  failedBody: {
    ...textStyle('body'),
    color: 'rgba(239,244,249,0.72)',
    marginTop: spacing.lg,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  metric: { alignItems: 'center' },
  metricValue: { ...textStyle('bodyLg'), color: colors.onNight },
  metricLabel: { ...textStyle('micro'), color: 'rgba(239,244,249,0.55)', marginTop: spacing.xs },
  regenerate: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  regenerateText: { ...textStyle('body'), color: colors.ink },
  emptyText: { ...textStyle('body'), color: colors.ink60 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18,42,70,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.zenith,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.ink40,
    marginBottom: spacing.lg,
  },
  sheetTitle: { ...textStyle('sheetTitle'), color: colors.ink },
  sheetBody: { ...textStyle('bodySm'), color: colors.ink60, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  sheetPrimary: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  sheetPrimaryText: { ...textStyle('body'), color: colors.white },
});
