import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';
import { useDietProfileQuery, useUpdateDietProfileMutation } from '@/features/onboarding';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import {
  RebuildingPlanCard,
  type BuildingStatus,
} from '@/features/nutrition/components/RebuildingPlanCard';
import { RegenerateSheet } from '@/features/nutrition/components/RegenerateSheet';
import {
  useMealPlanQuery,
  useRegenerateMealPlanMutation,
} from '@/features/nutrition/api/mealPlanApi';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import { todayISO } from '@/features/nutrition/api/nutritionApi';
import type { BudgetTier, CookingFrequency } from '@/shared/types/dietProfile';
import type { MealPlanStatus, PlannedMeal, RegenerationReason } from '@/shared/types/mealPlan';

const MEAL_LABEL: Record<PlannedMeal['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

function displayNumber(value: number | null | undefined): string {
  return String(Math.round(typeof value === 'number' && Number.isFinite(value) ? value : 0));
}

function statusLabel(status: PlannedMeal['status']): string {
  if (status === 'logged_as_planned') return 'Logged';
  if (status === 'logged_modified') return 'Modified';
  if (status === 'eaten_outside') return 'Outside';
  return status.replaceAll('_', ' ');
}

function isBuildingStatus(status: MealPlanStatus): status is BuildingStatus {
  return status === 'pending' || status === 'generating' || status === 'validating';
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
  const [activeReason, setActiveReason] = useState<RegenerationReason | null>(null);
  const [contextAsk, setContextAsk] = useState<'budget' | 'cooking' | null>(null);
  const [budget, setBudget] = useState<BudgetTier>('moderate');
  const [cooking, setCooking] = useState<CookingFrequency>('once_daily');

  const plan = planQuery.data?.status === 'ready' ? planQuery.data : null;
  const buildingStatus =
    planQuery.data && isBuildingStatus(planQuery.data.status) ? planQuery.data.status : null;
  const failedPlan = planQuery.data?.status === 'failed';
  const quotaError = quotaErrorFrom(regenerate.error);

  const regenerateNow = (selectedReason = reason) => {
    setActiveReason(selectedReason);
    regenerate.mutate(
      { regeneration_reason: selectedReason },
      {
        onSuccess: () => {
          setReasonOpen(false);
          setContextAsk(null);
        },
        onError: () => setActiveReason(null),
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
      <SkyBackground style={StyleSheet.absoluteFill} />
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
            <Pressable
              onPress={() => setReasonOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Regenerate plan"
              style={styles.regenerate}
            >
              <Text style={styles.regenerateText}>Regenerate plan</Text>
            </Pressable>
          </>
        ) : buildingStatus ? (
          <RebuildingPlanCard status={buildingStatus} reason={activeReason} />
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
        quotaError={quotaError}
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
    backgroundColor: withAlpha(colors.white, 0.42),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { ...textStyle('cardValue'), color: colors.ink },
  eyebrow: { ...textStyle('label'), color: colors.ink45 },
  loading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  warning: { marginBottom: spacing.lg },
  warningText: { ...textStyle('bodySm'), color: colors.ink62 },
  mealList: { gap: spacing.sm },
  mealRow: {
    minHeight: 82,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: withAlpha(colors.white, 0.52),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.66),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mealRowDone: { backgroundColor: colors.ink },
  mealCopy: { flex: 1 },
  mealMeta: { ...textStyle('micro'), color: colors.ink45 },
  mealMetaDone: { ...textStyle('micro'), color: withAlpha(colors.fog, 0.55) },
  mealName: { ...textStyle('bodyLg'), color: colors.ink, marginTop: spacing.xs },
  mealNameDone: { ...textStyle('bodyLg'), color: colors.onNight, marginTop: spacing.xs },
  mealMacros: { ...textStyle('caption'), color: colors.ink62, marginTop: spacing.xs },
  mealMacrosDone: {
    ...textStyle('caption'),
    color: withAlpha(colors.fog, 0.62),
    marginTop: spacing.xs,
  },
  status: { ...textStyle('micro'), color: colors.ink62, textTransform: 'capitalize' },
  statusDone: {
    ...textStyle('micro'),
    color: withAlpha(colors.fog, 0.7),
    textTransform: 'capitalize',
  },
  totalCard: { marginTop: spacing.lg },
  darkLabel: { ...textStyle('label'), color: withAlpha(colors.fog, 0.55) },
  failedBody: {
    ...textStyle('body'),
    color: withAlpha(colors.fog, 0.72),
    marginTop: spacing.lg,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  metric: { alignItems: 'center' },
  metricValue: { ...textStyle('bodyLg'), color: colors.onNight },
  metricLabel: {
    ...textStyle('micro'),
    color: withAlpha(colors.fog, 0.55),
    marginTop: spacing.xs,
  },
  regenerate: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.62),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  regenerateText: { ...textStyle('body'), color: colors.ink },
  emptyText: { ...textStyle('body'), color: colors.ink62 },
});
