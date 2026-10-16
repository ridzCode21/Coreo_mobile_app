import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { MacroSummaryCard } from '@/features/nutrition/components/MacroSummaryCard';
import { nextPlannedMeal } from '@/features/nutrition/lib/dietHome';
import type { MacroTargets } from '@/features/nutrition/lib/macros';
import { MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { MacroSummary } from '@/shared/types/food';
import type { AssistantPromptOption, MealPlanDetail, PlannedMeal } from '@/shared/types/mealPlan';

const PLAN_DISPLAY_ORDER: readonly PlannedMeal['meal_type'][] = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
];

type PlanReadyStateProps = {
  plan: MealPlanDetail;
  targets: MacroTargets;
  consumed: MacroSummary;
  prompts: AssistantPromptOption[];
  onMeal: (mealId: number) => void;
  onPrompt: (promptId: number) => void;
  onSeeFullPlan: () => void;
  onRegenerate: () => void;
};

export function PlanReadyState({
  plan,
  targets,
  consumed,
  prompts,
  onMeal,
  onPrompt,
  onSeeFullPlan,
  onRegenerate,
}: PlanReadyStateProps) {
  const nextMeal = nextPlannedMeal(plan.meals);
  const meals = [...plan.meals].sort(
    (left, right) =>
      PLAN_DISPLAY_ORDER.indexOf(left.meal_type) - PLAN_DISPLAY_ORDER.indexOf(right.meal_type),
  );

  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Carbs early, protein steady</Text>
        <Text style={styles.titleAccent}>— here&apos;s the shape of it.</Text>
      </View>
      <View style={styles.summaryCard}>
        <MacroSummaryCard
          targets={targets}
          consumed={consumed}
          hint={null}
          macroDisplay="remaining"
          variant="plan"
        />
      </View>
      <GlassCard variant="light" radius={radii.planMealList} padded={false} style={styles.mealCard}>
        {meals.map((meal, index) => (
          <MealRow
            key={meal.id}
            meal={meal}
            next={meal.id === nextMeal?.id}
            last={index === meals.length - 1}
            onPress={() => onMeal(meal.id)}
          />
        ))}
      </GlassCard>
      {prompts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptRow}
        >
          {prompts.map((prompt) => (
            <Pressable
              key={prompt.id}
              onPress={() => onPrompt(prompt.id)}
              accessibilityRole="button"
              accessibilityLabel={prompt.display_text}
            >
              <GlassCard variant="chip" radius={radii.pill} padded={false}>
                <View style={styles.promptChip}>
                  <Text style={styles.promptText}>{prompt.display_text}</Text>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          onPress={onSeeFullPlan}
          accessibilityRole="button"
          accessibilityLabel="See full plan"
          style={styles.fullPlanPressable}
        >
          <LinearGradient
            colors={glass.chipSelected.gradient}
            start={glass.chipSelected.start}
            end={glass.chipSelected.end}
            style={styles.fullPlanButton}
          >
            <Text style={styles.fullPlanText}>See full plan</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onRegenerate}
          accessibilityRole="button"
          accessibilityLabel="Regenerate plan"
          style={styles.regenerateButton}
        >
          <Svg
            width={componentSizes.planRegenerateIcon}
            height={componentSizes.planRegenerateIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15"
              stroke={colors.white}
              strokeWidth={componentSizes.planRegenerateStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

function MealRow({
  meal,
  next,
  last,
  onPress,
}: {
  meal: PlannedMeal;
  next: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const done = meal.status !== 'planned' && meal.status !== 'missed';
  const state = done ? 'done' : next ? 'next-up' : 'future';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${MEAL_LABEL[meal.meal_type]} ${meal.name}`}
      testID={`plan-meal-row-${meal.id}-${state}`}
      style={[
        styles.mealRow,
        !last && styles.mealRowBorder,
        done && styles.doneRow,
        next && styles.nextRow,
      ]}
    >
      <View style={styles.mealCopy}>
        <Text style={styles.mealMeta}>
          {MEAL_LABEL[meal.meal_type]}
          {next ? ' · Next up' : ''}
        </Text>
        <Text style={[styles.mealName, next && styles.nextMealName, done && styles.doneMealName]}>
          {meal.name}
        </Text>
      </View>
      {done ? (
        <Svg
          width={componentSizes.planMealCheckIcon}
          height={componentSizes.planMealCheckIcon}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d="M20 6L9 17l-5-5"
            stroke={colors.label}
            strokeWidth={componentSizes.planMealIconStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <View style={styles.calorieWrap}>
          <Text style={styles.calories}>{Math.round(meal.calories_kcal)}</Text>
          {next ? (
            <Svg
              width={componentSizes.planMealChevronIcon}
              height={componentSizes.planMealChevronIcon}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Path
                d="M9 18l6-6-6-6"
                stroke={colors.ink40}
                strokeWidth={componentSizes.planMealIconStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  titleBlock: { marginTop: spacing.planReadyTitleTop },
  title: { ...textStyle('planReadyTitle'), color: colors.ink },
  titleAccent: { ...textStyle('planReadyTitleAccent'), color: colors.ink },
  summaryCard: { marginTop: spacing.planReadyCardTop },
  mealCard: { marginTop: spacing.planReadyCardTop },
  mealRow: {
    paddingVertical: spacing.planMealRowPaddingY,
    paddingHorizontal: spacing.planMealRowPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mealRowBorder: {
    borderBottomWidth: componentSizes.hairline,
    borderBottomColor: withAlpha(colors.ink, 0.1),
  },
  doneRow: { opacity: 0.5 },
  nextRow: { backgroundColor: withAlpha(colors.white, 0.4) },
  mealCopy: { flex: 1 },
  mealMeta: { ...textStyle('micro'), color: colors.label },
  mealName: {
    ...textStyle('planMealName'),
    color: colors.ink,
    marginTop: spacing.planMealNameTop,
  },
  nextMealName: { ...textStyle('planMealNameNext') },
  doneMealName: { textDecorationLine: 'line-through' },
  calorieWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sliderCaptionGap },
  calories: { ...textStyle('planMealCalories'), color: colors.ink60 },
  promptRow: { gap: spacing.sm, paddingTop: spacing.ms },
  promptChip: {
    minHeight: componentSizes.planQuickActionHeight,
    paddingHorizontal: spacing.ml,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: { ...textStyle('planQuickAction'), color: colors.ink75 },
  actions: { flexDirection: 'row', gap: spacing.ms, marginTop: spacing.planActionsTop },
  fullPlanPressable: {
    flex: 1,
    borderRadius: radii.planAction,
    shadowColor: glass.chipSelected.shadowColor,
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 1,
    shadowRadius: componentSizes.planActionShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  fullPlanButton: {
    minHeight: componentSizes.planFooterActionHeight,
    borderRadius: radii.planAction,
    borderWidth: componentSizes.hairline,
    borderColor: glass.chipSelected.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlanText: { ...textStyle('planFooterAction'), color: colors.ink },
  regenerateButton: {
    width: componentSizes.planFooterActionHeight,
    height: componentSizes.planFooterActionHeight,
    borderRadius: radii.planAction,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 1,
    shadowRadius: componentSizes.planActionShadowRadius,
    elevation: componentSizes.dietElevation,
  },
});
