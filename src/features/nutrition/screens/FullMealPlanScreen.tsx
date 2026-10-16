import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { useMealPlanQuery } from '@/features/nutrition/api/mealPlanApi';
import { todayISO } from '@/features/nutrition/api/nutritionApi';
import {
  FULL_PLAN_ROW_LABEL,
  fullPlanRowState,
  type FullPlanRowState,
} from '@/features/nutrition/lib/fullPlanRow';
import { MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
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
import type { PlannedMeal } from '@/shared/types/mealPlan';

const PLAN_DISPLAY_ORDER: readonly PlannedMeal['meal_type'][] = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
];

const BANNER_COPY =
  'Macros landed a touch off today — still within range. Tomorrow adjusts, nothing repeats.';

type RowPalette = (typeof glass)[
  'planRowLogged' | 'planRowNext' | 'planRowSkipped' | 'planRowPlanned'];

const ROW_PALETTE: Record<FullPlanRowState, RowPalette> = {
  logged: glass.planRowLogged,
  next: glass.planRowNext,
  skipped: glass.planRowSkipped,
  planned: glass.planRowPlanned,
};

function displayNumber(value: number | null): string {
  return value === null ? '—' : Math.round(value).toLocaleString('en-US');
}

export default function FullMealPlanScreen() {
  const router = useRouter();
  const planQuery = useMealPlanQuery(todayISO());
  const plan = planQuery.data?.status === 'ready' ? planQuery.data : null;
  const meals = plan
    ? [...plan.meals].sort(
        (left, right) =>
          PLAN_DISPLAY_ORDER.indexOf(left.meal_type) - PLAN_DISPLAY_ORDER.indexOf(right.meal_type),
      )
    : [];
  const nextMeal = meals.find((meal) => meal.status === 'planned') ?? null;

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
          <Text style={styles.eyebrow}>Today&apos;s plan</Text>
          <View style={styles.backPlaceholder} />
        </View>

        {planQuery.isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : planQuery.isError ? (
          <Text style={styles.stateText}>
            Couldn&apos;t load today&apos;s plan. Pull to try again.
          </Text>
        ) : plan ? (
          <>
            {plan.validation_result.macro_ok === false ? (
              <GlassCard
                variant="light"
                radius={radii.control}
                style={styles.warning}
                contentPaddingVertical={spacing.md}
                contentPaddingHorizontal={spacing.lg}
              >
                <View style={styles.warningRow}>
                  <Svg
                    width={componentSizes.planMealCheckIcon}
                    height={componentSizes.planMealCheckIcon}
                  >
                    <Circle
                      cx={componentSizes.planMealCheckIcon / 2}
                      cy={componentSizes.planMealCheckIcon / 2}
                      r={componentSizes.planMealCheckIcon / 2 - componentSizes.hairline}
                      fill="none"
                      stroke={colors.ink55}
                      strokeWidth={componentSizes.hairline}
                    />
                    <Path
                      d="M6.5 3.5v4M6.5 9.5h.01"
                      stroke={colors.ink55}
                      strokeWidth={componentSizes.hairline}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <Text style={styles.warningText}>{BANNER_COPY}</Text>
                </View>
              </GlassCard>
            ) : null}
            <View style={styles.mealList}>
              {meals.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  state={fullPlanRowState(meal, nextMeal?.id ?? null)}
                  onPress={() => router.push(`/diet/meal/${meal.id}` as Href)}
                />
              ))}
            </View>
            <GlassCard
              variant="dietHero"
              radius={radii.ml}
              style={styles.totalCard}
              contentPaddingVertical={spacing.lg}
              contentPaddingHorizontal={spacing.xl}
            >
              <View style={styles.totalRow}>
                <Metric label="kcal" value={displayNumber(plan.total_calories)} />
                <Metric label="protein" value={`${displayNumber(plan.total_protein_g)}g`} />
                <Metric label="carbs" value={`${displayNumber(plan.total_carbs_g)}g`} />
                <Metric label="fat" value={`${displayNumber(plan.total_fat_g)}g`} />
              </View>
            </GlassCard>
          </>
        ) : (
          <Text style={styles.stateText}>No plan is ready yet.</Text>
        )}
      </Screen>
    </View>
  );
}

type MealRowProps = {
  meal: PlannedMeal;
  state: FullPlanRowState;
  onPress: () => void;
};

function MealRow({ meal, state, onPress }: MealRowProps) {
  const palette = ROW_PALETTE[state];
  const logged = state === 'logged';
  const isNext = state === 'next';
  const skipped = state === 'skipped';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${MEAL_LABEL[meal.meal_type]} ${meal.name}`}
      style={[styles.mealRowShadow, isNext && styles.nextShadow]}
    >
      <LinearGradient
        colors={palette.gradient}
        start={palette.start}
        end={palette.end}
        style={[styles.mealRow, { borderColor: palette.border }, skipped && styles.skippedRow]}
      >
        <View style={styles.mealCopy}>
          <Text style={[styles.mealMeta, logged && styles.mealMetaLogged]}>
            {MEAL_LABEL[meal.meal_type]}
          </Text>
          <Text
            style={[
              styles.mealName,
              logged && styles.mealNameLogged,
              isNext && styles.mealNameNext,
              skipped && styles.mealNameSkipped,
            ]}
          >
            {meal.name}
          </Text>
        </View>
        <View
          style={[
            styles.statePill,
            logged && styles.loggedPill,
            isNext && styles.nextPill,
            skipped && styles.skippedPill,
          ]}
        >
          <Text style={[styles.stateTextLabel, logged && styles.stateTextLogged]}>
            {FULL_PLAN_ROW_LABEL[state]}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
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
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.42),
    borderColor: withAlpha(colors.white, 0.65),
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
  backText: { ...textStyle('cardValue'), color: colors.ink },
  eyebrow: { ...textStyle('label'), color: colors.ink45 },
  warning: { marginTop: spacing.ml },
  warningRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  warningText: { ...textStyle('caption'), color: colors.ink62, flex: 1 },
  mealList: { gap: spacing.ms, marginTop: spacing.ml },
  mealRowShadow: { borderRadius: radii.md },
  nextShadow: {
    elevation: 3,
    shadowColor: glass.planRowNext.shadowColor,
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 1,
    shadowRadius: spacing.xxl,
  },
  mealRow: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: componentSizes.hairline,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sheetTitleGap,
    paddingVertical: spacing.ml,
  },
  skippedRow: { opacity: 0.6 },
  mealCopy: { flex: 1 },
  mealMeta: { ...textStyle('micro'), color: colors.label },
  mealMetaLogged: { color: withAlpha(colors.fog, 0.55) },
  mealName: { ...textStyle('fullPlanMealName'), color: colors.ink, marginTop: spacing.dockItemGap },
  mealNameLogged: { color: colors.onNight },
  mealNameNext: { ...textStyle('fullPlanMealNameNext') },
  mealNameSkipped: { textDecorationLine: 'line-through' },
  statePill: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.6),
    borderColor: withAlpha(colors.white, 0.75),
    borderRadius: radii.xs,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    minHeight: spacing.xxl,
    paddingHorizontal: spacing.ms,
  },
  loggedPill: {
    backgroundColor: withAlpha(colors.white, 0.18),
    borderColor: 'transparent',
  },
  nextPill: { backgroundColor: colors.white },
  skippedPill: { backgroundColor: 'transparent', borderColor: 'transparent' },
  stateTextLabel: { ...textStyle('fullPlanStateLabel'), color: colors.ink62 },
  stateTextLogged: { color: colors.onNight },
  totalCard: { marginTop: 'auto' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center' },
  metricValue: { ...textStyle('bodyLg'), color: colors.onNight },
  metricLabel: { ...textStyle('dockLabel'), color: withAlpha(colors.fog, 0.55) },
  stateContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  stateText: { ...textStyle('body'), color: colors.ink62, marginTop: spacing.xl },
});
