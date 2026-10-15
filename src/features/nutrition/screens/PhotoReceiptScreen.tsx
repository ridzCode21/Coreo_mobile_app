import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

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
import { todayISO, useFoodEntriesQuery } from '@/features/nutrition/api/nutritionApi';
import {
  AfterSnapBackIcon,
  AfterSnapCheckIcon,
} from '@/features/nutrition/components/AfterSnapIcons';
import { MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import { nextMealLabel, sortByGuessed } from '@/features/nutrition/lib/photoResult';
import {
  photoReceiptRouteParamsSchema,
  photoReceiptSummarySchema,
  type PhotoReceiptSummary,
} from '@/features/nutrition/schemas';

const MACRO_BACKGROUND = withAlpha(colors.white, 0.6);
const MACRO_BORDER = withAlpha(colors.white, 0.75);
const ROW_DIVIDER = withAlpha(colors.ink, 0.08);
const SECONDARY_ACTION_BACKGROUND = withAlpha(colors.white, 0.5);
const SECONDARY_ACTION_BORDER = withAlpha(colors.white, 0.7);

function parseSummary(raw?: string): PhotoReceiptSummary | null {
  if (!raw) return null;
  try {
    return photoReceiptSummarySchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export default function PhotoReceiptScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ summary?: string }>();
  const routeParams = photoReceiptRouteParamsSchema.safeParse(rawParams);
  const summary = parseSummary(routeParams.success ? routeParams.data.summary : undefined);
  const foodEntries = useFoodEntriesQuery(todayISO());

  if (!summary) {
    return (
      <View style={styles.root}>
        <SkyBackground variant="sheet" style={StyleSheet.absoluteFill} />
        <Screen background="transparent">
          <Text style={styles.routeError}>I couldn&apos;t open that receipt.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Diet"
            onPress={() => router.replace('/diet')}
            style={styles.errorAction}
          >
            <Text style={styles.errorActionText}>Back to Diet</Text>
          </Pressable>
        </Screen>
      </View>
    );
  }

  const remaining = foodEntries.data?.macro_summary.calories.remaining ?? '—';
  const displayItems = sortByGuessed(summary.items);
  const prefill = {
    food_name: summary.food_name,
    meal_type: summary.meal_type,
    calories: summary.calories,
    protein_g: summary.protein_g,
    carbs_g: summary.carbs_g,
    fat_g: summary.fat_g,
    guessed_count: summary.items.filter((item) => item.guessed).length,
    items: summary.items,
  };
  const confirmUrl = () => {
    const query = new URLSearchParams({ source: 'photo', prefill: JSON.stringify(prefill) });
    return `/diet/confirm?${query.toString()}` as Href;
  };

  return (
    <View style={styles.root}>
      <SkyBackground variant="sheet" style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/diet')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={spacing.xs}
            style={styles.backButton}
          >
            <LinearGradient
              colors={glass.afterSnapNav.gradient}
              start={glass.afterSnapNav.start}
              end={glass.afterSnapNav.end}
              style={styles.backButtonFill}
            >
              <AfterSnapBackIcon />
            </LinearGradient>
          </Pressable>
          <Text style={styles.eyebrow}>Logged · {MEAL_LABEL[summary.meal_type]}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.summary}>
          <Text style={styles.mealName}>{summary.food_name}</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.calories}>{summary.calories}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
          <View style={styles.macros}>
            <Text style={styles.macroPill}>P {summary.protein_g}g</Text>
            <Text style={styles.macroPill}>C {summary.carbs_g}g</Text>
            <Text style={styles.macroPill}>F {summary.fat_g}g</Text>
          </View>
          <Text style={styles.planCopy}>
            Leaves {remaining} for {nextMealLabel(summary.meal_type)}. Right on plan.
          </Text>
        </View>

        <GlassCard
          variant="afterSnapSurface"
          radius={radii.dietNextMeal}
          style={styles.itemsCard}
          contentPaddingVertical={spacing.afterSnapReceiptListPaddingY}
          contentPaddingHorizontal={spacing.xl}
        >
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            return (
              <View
                key={`${item.name}-${index}`}
                style={[styles.itemRow, !isLast && styles.itemRowDivider]}
              >
                <Text style={item.guessed ? styles.guessedItem : styles.itemName}>
                  {item.guessed
                    ? `${item.name} · my guess`
                    : `${item.name}${item.portion_label ? ` · ${item.portion_label}` : ''}`}
                </Text>
                {item.guessed ? (
                  <Pressable
                    onPress={() => router.push(confirmUrl())}
                    accessibilityRole="button"
                    accessibilityLabel={`Fix ${item.name}`}
                    hitSlop={spacing.ms}
                    style={styles.rowFix}
                  >
                    <Text style={styles.rowFixText}>Fix</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.itemCalories}>{item.est_calories}</Text>
                )}
              </View>
            );
          })}
        </GlassCard>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(confirmUrl())}
            accessibilityRole="button"
            accessibilityLabel="Fix one thing"
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>Fix one thing</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/diet')}
            accessibilityRole="button"
            accessibilityLabel="Looks right"
            style={styles.primaryActionWrap}
          >
            <LinearGradient
              colors={glass.chipSelected.gradient}
              start={glass.chipSelected.start}
              end={glass.chipSelected.end}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>Looks right</Text>
              <View style={styles.primaryCheck}>
                <AfterSnapCheckIcon size={componentSizes.mealReviewBackIcon} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: {
    width: componentSizes.mealReviewBackControl,
    height: componentSizes.mealReviewBackControl,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  backButtonFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  headerSpacer: { width: componentSizes.mealReviewBackControl },
  summary: { marginTop: spacing.afterSnapReceiptSummaryTop, alignItems: 'center' },
  mealName: { ...textStyle('afterSnapReceiptMeal'), color: colors.ink60, textAlign: 'center' },
  calorieRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  calories: { ...textStyle('afterSnapReceiptCalories'), color: colors.ink },
  calorieUnit: { ...textStyle('afterSnapReceiptUnit'), color: colors.ink55 },
  macros: {
    marginTop: spacing.ml,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.ms,
  },
  macroPill: {
    ...textStyle('afterSnapReceiptMacro'),
    height: componentSizes.afterSnapReceiptMacroHeight,
    paddingHorizontal: spacing.sm + spacing.sliderCaptionGap + componentSizes.hairline,
    borderRadius: radii.afterSnapMacro,
    borderWidth: componentSizes.hairline,
    borderColor: MACRO_BORDER,
    backgroundColor: MACRO_BACKGROUND,
    color: colors.ink,
    textAlignVertical: 'center',
    paddingTop: spacing.sm,
  },
  planCopy: {
    ...textStyle('afterSnapReceiptPlan'),
    color: colors.ink55,
    marginTop: spacing.ms,
    textAlign: 'center',
  },
  itemsCard: { marginTop: spacing.afterSnapReceiptListTop },
  itemRow: {
    minHeight: componentSizes.minimumTapTarget,
    paddingVertical: spacing.afterSnapReceiptRowPaddingY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemRowDivider: {
    borderBottomWidth: componentSizes.hairline,
    borderBottomColor: ROW_DIVIDER,
  },
  itemName: { ...textStyle('afterSnapReceiptRow'), color: colors.ink, flexShrink: 1 },
  guessedItem: { ...textStyle('afterSnapReceiptGuessed'), color: colors.ink, flexShrink: 1 },
  itemCalories: { ...textStyle('caption'), color: colors.ink60 },
  rowFix: {
    minWidth: componentSizes.minimumTapTarget,
    height: componentSizes.afterSnapReceiptFixHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xs,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowFixText: { ...textStyle('afterSnapReceiptFix'), color: colors.white },
  actions: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    gap: spacing.afterSnapReceiptActionGap,
  },
  secondaryAction: {
    flex: 1,
    height: componentSizes.afterSnapReceiptActionHeight,
    borderRadius: radii.xl,
    borderWidth: componentSizes.hairline,
    borderColor: SECONDARY_ACTION_BORDER,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { ...textStyle('afterSnapReceiptAction'), color: colors.ink75 },
  primaryActionWrap: { flex: 1.4, borderRadius: radii.xl, overflow: 'hidden' },
  primaryAction: {
    height: componentSizes.afterSnapReceiptActionHeight,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryActionText: { ...textStyle('afterSnapReceiptActionStrong'), color: colors.ink },
  primaryCheck: {
    width: componentSizes.afterSnapReceiptCheckCircle,
    height: componentSizes.afterSnapReceiptCheckCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeError: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  errorAction: { minHeight: componentSizes.minimumTapTarget, justifyContent: 'center' },
  errorActionText: { ...textStyle('linkMd'), color: colors.ink75, textAlign: 'center' },
});
