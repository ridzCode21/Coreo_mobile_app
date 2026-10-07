import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ApiError } from '@/shared/api/errors';
import { GlassCard } from '@/shared/components/GlassCard';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useDietProfileQuery, useUpdateDietProfileMutation } from '@/features/onboarding';
import {
  useAssistantConfirmMutation,
  useAssistantMutation,
  useAssistantPromptsQuery,
  useCreateMealPlanMutation,
  useMealPlanQuery,
  useRegenerateMealPlanMutation,
} from '@/features/nutrition/api/mealPlanApi';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { quotaErrorFrom } from '@/features/nutrition/lib/quotaError';
import type { AssistantProposal, PlannedMeal, RecipeJson } from '@/shared/types/mealPlan';
import type { CuisinePreference } from '@/shared/types/dietProfile';

const PLAN_ROUTE = '/diet/plan' as Href;

const CUISINES: { label: string; value: CuisinePreference }[] = [
  { label: 'Indian', value: 'indian' },
  { label: 'South Indian', value: 'south_indian' },
  { label: 'North Indian', value: 'north_indian' },
  { label: 'Mediterranean', value: 'mediterranean' },
  { label: 'Surprise me', value: 'any' },
];

const MEAL_LABEL: Record<PlannedMeal['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function compactStatus(status: PlannedMeal['status']): string {
  if (status === 'logged_as_planned') return 'Logged';
  if (status === 'logged_modified') return 'Logged';
  if (status === 'eaten_outside') return 'Outside';
  return status.replaceAll('_', ' ');
}

export function MealPlanCard({ date }: { date: string }) {
  const router = useRouter();
  const profileQuery = useDietProfileQuery();
  const planQuery = useMealPlanQuery(date);
  const createPlan = useCreateMealPlanMutation(date);
  const regeneratePlan = useRegenerateMealPlanMutation(date);
  const updateProfile = useUpdateDietProfileMutation();
  const promptsQuery = useAssistantPromptsQuery('meal_plan');
  const assistant = useAssistantMutation(date);
  const confirmAssistant = useAssistantConfirmMutation(date);
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisinePreference>('indian');
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [recipe, setRecipe] = useState<RecipeJson | null>(null);

  const profile = profileQuery.data;
  const quotaError =
    quotaErrorFrom(createPlan.error) ??
    quotaErrorFrom(regeneratePlan.error) ??
    quotaErrorFrom(assistant.error) ??
    quotaErrorFrom(confirmAssistant.error);

  const generate = () => {
    if (profile && !profile.cuisine_preference) {
      setCuisineOpen(true);
      return;
    }
    if (planQuery.data?.status === 'failed') {
      regeneratePlan.mutate({ regeneration_reason: 'surprise_me' });
      return;
    }
    createPlan.mutate();
  };

  const saveCuisineAndGenerate = () => {
    updateProfile.mutate(
      { cuisine_preference: selectedCuisine },
      {
        onSuccess: () => {
          setCuisineOpen(false);
          createPlan.mutate();
        },
      },
    );
  };

  const runPrompt = (promptId: number) => {
    assistant.mutate(promptId, {
      onSuccess: (response) => {
        if ('recipe' in response) {
          setRecipe(response.recipe);
          return;
        }
        setProposal(response);
      },
    });
  };

  const isBuilding =
    planQuery.data && ['pending', 'generating', 'validating'].includes(planQuery.data.status);
  const noPlan = planQuery.isError && isNotFound(planQuery.error);
  const failedPlan = planQuery.data?.status === 'failed';
  const plan = planQuery.data?.status === 'ready' ? planQuery.data : null;
  const generating = createPlan.isPending || updateProfile.isPending || regeneratePlan.isPending;

  return (
    <>
      <GlassCard variant={plan ? 'light' : 'night'} radius={radii.xl} style={styles.card}>
        <View style={styles.header}>
          <Text style={plan ? styles.lightLabel : styles.darkLabel}>Today&apos;s plan</Text>
          {plan ? (
            <Pressable
              onPress={() => router.push(PLAN_ROUTE)}
              accessibilityRole="button"
              accessibilityLabel="See full plan"
            >
              <Text style={styles.linkText}>See full plan</Text>
            </Pressable>
          ) : null}
        </View>

        {plan ? (
          <>
            <Text style={styles.planTitle}>Carbs early, protein steady.</Text>
            <View style={styles.mealList}>
              {plan.meals.map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => router.push(`/diet/meal/${meal.id}` as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={`${MEAL_LABEL[meal.meal_type]} ${meal.name}`}
                  style={styles.mealRow}
                >
                  <View style={styles.mealCopy}>
                    <Text style={styles.mealMeta}>{MEAL_LABEL[meal.meal_type]}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealMacros}>
                      {meal.calories_kcal} kcal · {Math.round(meal.protein_g)}g protein
                    </Text>
                  </View>
                  <Text style={styles.statusChip}>{compactStatus(meal.status)}</Text>
                </Pressable>
              ))}
            </View>
            {promptsQuery.data?.options.length ? (
              <View style={styles.promptRow}>
                {promptsQuery.data.options.map((prompt) => (
                  <SelectableChip
                    key={prompt.id}
                    label={prompt.display_text}
                    selected={false}
                    onPress={() => runPrompt(prompt.id)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : isBuilding ? (
          <View style={styles.building}>
            <ActivityIndicator color={colors.onNight} />
            <Text style={styles.darkTitle}>Building your plan...</Text>
            <Text style={styles.darkBody}>Reading your usuals. Balancing your macros.</Text>
          </View>
        ) : failedPlan ? (
          <View style={styles.empty}>
            <Text style={styles.darkTitle}>That plan didn&apos;t come together.</Text>
            <Text style={styles.darkBody}>
              The backend finished with no meals. Try again and I&apos;ll rebuild it cleanly.
            </Text>
            <Pressable
              onPress={generate}
              disabled={generating}
              accessibilityRole="button"
              accessibilityLabel="Try generating today's plan again"
              style={styles.primary}
            >
              {generating ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.primaryText}>Try again</Text>
              )}
            </Pressable>
          </View>
        ) : noPlan || planQuery.isError ? (
          <View style={styles.empty}>
            <Text style={styles.darkTitle}>Let&apos;s build today&apos;s plate.</Text>
            <Text style={styles.darkBody}>One tap, and I fit it to your current targets.</Text>
            <Pressable
              onPress={generate}
              disabled={generating}
              accessibilityRole="button"
              accessibilityLabel="Generate today's plan"
              style={styles.primary}
            >
              {generating ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.primaryText}>Generate today&apos;s plan</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.building}>
            <ActivityIndicator color={colors.onNight} />
          </View>
        )}
      </GlassCard>

      {quotaError ? <QuotaBanner error={quotaError} /> : null}

      <CuisineSheet
        visible={cuisineOpen}
        selected={selectedCuisine}
        onSelect={setSelectedCuisine}
        onClose={() => setCuisineOpen(false)}
        onSubmit={saveCuisineAndGenerate}
        saving={updateProfile.isPending || createPlan.isPending}
      />
      <RecipeSheet recipe={recipe} onClose={() => setRecipe(null)} />
      <ProposalSheet
        proposal={proposal}
        saving={confirmAssistant.isPending}
        onClose={() => setProposal(null)}
        onConfirm={() => {
          if (!proposal) return;
          confirmAssistant.mutate(proposal.proposal_id, { onSuccess: () => setProposal(null) });
        }}
      />
    </>
  );
}

function CuisineSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onSubmit,
  saving,
}: {
  visible: boolean;
  selected: CuisinePreference;
  onSelect: (value: CuisinePreference) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetLabel}>Just one quick thing</Text>
          <Text style={styles.sheetTitle}>What flavours feel like home today?</Text>
          <View style={styles.promptRow}>
            {CUISINES.map((cuisine) => (
              <SelectableChip
                key={cuisine.value}
                label={cuisine.label}
                selected={selected === cuisine.value}
                onPress={() => onSelect(cuisine.value)}
              />
            ))}
          </View>
          <Pressable
            onPress={onSubmit}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Continue and generate plan"
            style={styles.sheetPrimary}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.sheetPrimaryText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RecipeSheet({ recipe, onClose }: { recipe: RecipeJson | null; onClose: () => void }) {
  return (
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{recipe?.title}</Text>
          {recipe?.steps.map((step, index) => (
            <Text key={step} style={styles.sheetBody}>
              {index + 1}. {step}
            </Text>
          ))}
          <Pressable onPress={onClose} style={styles.sheetPrimary} accessibilityRole="button">
            <Text style={styles.sheetPrimaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ProposalSheet({
  proposal,
  saving,
  onClose,
  onConfirm,
}: {
  proposal: AssistantProposal | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={proposal !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetLabel}>Coreo suggests</Text>
          <Text style={styles.sheetTitle}>{proposal?.summary}</Text>
          <View style={styles.sheetButtonRow}>
            <Pressable onPress={onClose} style={styles.sheetSecondary} accessibilityRole="button">
              <Text style={styles.sheetSecondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              style={styles.sheetPrimaryHalf}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.sheetPrimaryText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  darkLabel: {
    ...textStyle('label'),
    color: 'rgba(239,244,249,0.55)',
  },
  lightLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  linkText: {
    ...textStyle('caption'),
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  planTitle: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    marginTop: spacing.md,
  },
  mealList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  mealRow: {
    minHeight: 72,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealCopy: {
    flex: 1,
  },
  mealMeta: {
    ...textStyle('micro'),
    color: colors.ink45,
  },
  mealName: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    marginTop: spacing.xs,
  },
  mealMacros: {
    ...textStyle('caption'),
    color: colors.ink60,
    marginTop: spacing.xs,
  },
  statusChip: {
    ...textStyle('micro'),
    color: colors.ink60,
    textTransform: 'capitalize',
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  building: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  empty: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  darkTitle: {
    ...textStyle('bodyLg'),
    color: colors.onNight,
  },
  darkBody: {
    ...textStyle('bodySm'),
    color: 'rgba(239,244,249,0.68)',
  },
  primary: {
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryText: {
    ...textStyle('body'),
    color: colors.ink,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18,42,70,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  sheetLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  sheetTitle: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
    marginTop: spacing.sm,
  },
  sheetBody: {
    ...textStyle('body'),
    color: colors.ink60,
    marginTop: spacing.md,
  },
  sheetPrimary: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  sheetPrimaryText: {
    ...textStyle('body'),
    color: colors.white,
  },
  sheetButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sheetSecondary: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryHalf: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: {
    ...textStyle('body'),
    color: colors.ink60,
  },
});
