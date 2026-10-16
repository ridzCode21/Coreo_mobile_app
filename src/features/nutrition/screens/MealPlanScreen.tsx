import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDietProfileQuery, useUpdateDietProfileMutation } from '@/features/onboarding';
import {
  useAssistantPromptsQuery,
  useCreateMealPlanMutation,
  useMealPlanQuery,
  useRegenerateMealPlanMutation,
} from '@/features/nutrition/api/mealPlanApi';
import { todayISO, useFoodEntriesQuery } from '@/features/nutrition/api/nutritionApi';
import { PlanBuildingState } from '@/features/nutrition/components/PlanBuildingState';
import { PlanAssistantFlow } from '@/features/nutrition/components/PlanAssistantFlow';
import { PlanFailedState } from '@/features/nutrition/components/PlanFailedState';
import { PlanNoPlanState } from '@/features/nutrition/components/PlanNoPlanState';
import { PlanReadyState } from '@/features/nutrition/components/PlanReadyState';
import { PlanScreenHeader } from '@/features/nutrition/components/PlanScreenHeader';
import { RebuildingPlanCard } from '@/features/nutrition/components/RebuildingPlanCard';
import { RegenerateSheet } from '@/features/nutrition/components/RegenerateSheet';
import type { BuildingStatus } from '@/features/nutrition/lib/planBuildSteps';
import { normalizeMacroSummary, targetsFromProfile } from '@/features/nutrition/lib/macros';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import { ApiError } from '@/shared/api/errors';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, spacing, textStyle } from '@/shared/theme/tokens';
import type { BudgetTier, CookingFrequency } from '@/shared/types/dietProfile';
import type { MealPlanStatus, RegenerationReason } from '@/shared/types/mealPlan';

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function isBuildingStatus(status: MealPlanStatus): status is BuildingStatus {
  return status === 'pending' || status === 'generating' || status === 'validating';
}

export default function MealPlanScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const date = todayISO();
  const planQuery = useMealPlanQuery(date);
  const createPlan = useCreateMealPlanMutation(date);
  const regeneratePlan = useRegenerateMealPlanMutation(date);
  const profileQuery = useDietProfileQuery();
  const entriesQuery = useFoodEntriesQuery(date);
  const promptsQuery = useAssistantPromptsQuery('meal_plan');
  const updateProfile = useUpdateDietProfileMutation();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<RegenerationReason>('too_boring');
  const [activeReason, setActiveReason] = useState<RegenerationReason | null>(null);
  const [contextAsk, setContextAsk] = useState<'budget' | 'cooking' | null>(null);
  const [budget, setBudget] = useState<BudgetTier>('moderate');
  const [cooking, setCooking] = useState<CookingFrequency>('once_daily');
  const [assistantPromptId, setAssistantPromptId] = useState<number | null>(null);

  const noPlan = planQuery.isError && isNotFound(planQuery.error);
  const plan = planQuery.data?.status === 'ready' ? planQuery.data : null;
  const failedPlan = planQuery.data?.status === 'failed';
  const buildingStatus =
    planQuery.data && isBuildingStatus(planQuery.data.status) ? planQuery.data.status : null;
  const createQuotaError = quotaErrorFrom(createPlan.error);
  const regenerateQuotaError = quotaErrorFrom(regeneratePlan.error);
  const profile = profileQuery.data;
  const targets = profile ? targetsFromProfile(profile) : null;
  const consumed = normalizeMacroSummary(entriesQuery.data?.macro_summary);

  const regenerateNow = () => {
    setActiveReason(reason);
    regeneratePlan.mutate(
      { regeneration_reason: reason },
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
    updateProfile.mutate(patch, { onSuccess: regenerateNow });
  };

  const content = (() => {
    if (planQuery.isLoading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading today's plan" />
        </View>
      );
    }
    if (noPlan) {
      return (
        <PlanNoPlanState
          pending={createPlan.isPending}
          quotaError={createQuotaError}
          onGenerate={() => createPlan.mutate()}
        />
      );
    }
    if (buildingStatus) {
      return activeReason ? (
        <RebuildingPlanCard status={buildingStatus} reason={activeReason} />
      ) : (
        <PlanBuildingState status={buildingStatus} />
      );
    }
    if (failedPlan) {
      return (
        <PlanFailedState
          pending={createPlan.isPending}
          quotaError={createQuotaError}
          onRetry={() => createPlan.mutate()}
          onManualLog={() => router.push('/diet')}
        />
      );
    }
    if (plan) {
      if (profileQuery.isLoading || entriesQuery.isLoading) {
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading today's numbers" />
          </View>
        );
      }
      if (!targets || profileQuery.isError || entriesQuery.isError || !entriesQuery.data) {
        return (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>
              Couldn&apos;t load today&apos;s numbers. Pull to refresh in a moment.
            </Text>
          </View>
        );
      }
      return (
        <PlanReadyState
          plan={plan}
          targets={targets}
          consumed={consumed}
          prompts={promptsQuery.data?.options ?? []}
          onMeal={(mealId) => router.push(`/diet/meal/${mealId}` as Href)}
          onPrompt={setAssistantPromptId}
          onSeeFullPlan={() => router.push('/diet/plan/full')}
          onRegenerate={() => setReasonOpen(true)}
        />
      );
    }
    if (planQuery.isError) {
      return (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>
            Couldn&apos;t load today&apos;s plan. Pull to refresh in a moment.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorText}>Couldn&apos;t load today&apos;s plan. Pull to refresh.</Text>
      </View>
    );
  })();

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.screenFrame,
            {
              minHeight: Math.max(0, height - insets.top - insets.bottom - spacing.md - spacing.md),
            },
          ]}
        >
          <PlanScreenHeader onBack={() => router.back()} />
          {content}
        </View>
      </Screen>
      <RegenerateSheet
        visible={reasonOpen}
        reason={reason}
        contextAsk={contextAsk}
        budget={budget}
        cooking={cooking}
        saving={regeneratePlan.isPending || updateProfile.isPending}
        quotaError={regenerateQuotaError}
        onReason={setReason}
        onBudget={setBudget}
        onCooking={setCooking}
        onClose={() => {
          setReasonOpen(false);
          setContextAsk(null);
        }}
        onSubmit={contextAsk ? saveContextAsk : submitReason}
      />
      {assistantPromptId !== null ? (
        <PlanAssistantFlow
          date={date}
          promptId={assistantPromptId}
          onClose={() => setAssistantPromptId(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.screenPadBottom },
  screenFrame: { flexGrow: 1 },
  loading: {
    minHeight: componentSizes.planHeroIcon,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  errorState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  errorText: { ...textStyle('body'), color: colors.ink55, textAlign: 'center' },
});
