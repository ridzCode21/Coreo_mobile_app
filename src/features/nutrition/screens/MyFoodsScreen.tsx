import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

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
import { useFoodItemsQuery } from '@/features/nutrition/api/nutritionApi';
import type { FoodItem } from '@/shared/types/food';

function BackIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewBackIcon}
      height={componentSizes.mealReviewBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.ink80}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewBackIcon}
      height={componentSizes.mealReviewBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.white}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function UtensilsIcon() {
  return (
    <Svg
      width={componentSizes.myFoodsEmptyIcon}
      height={componentSizes.myFoodsEmptyIcon}
      viewBox="0 0 24 24"
      fill="none"
      opacity={0.28}
    >
      <Path
        d="M7 2v9a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2M7 2v20M11 2v7M17 2c-1.5 3-1.5 6 0 8s1.5 5 0 8"
        stroke={colors.ink}
        strokeWidth={componentSizes.myFoodsEmptyIconStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function macroLine(item: FoodItem): string {
  return `${Math.round(item.calories_per_100g)} kcal · ${Math.round(item.protein_g_per_100g)}g protein · ${Math.round(item.carbs_g_per_100g)}g carbs · ${Math.round(item.fat_g_per_100g)}g fat — per 100g`;
}

export default function MyFoodsScreen() {
  const router = useRouter();
  const foodsQuery = useFoodItemsQuery();
  const foods = foodsQuery.data;
  const openAddFood = () => router.push('/diet/add-food');

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={spacing.xs}
            style={styles.backButton}
          >
            <LinearGradient
              colors={glass.light.gradient}
              start={glass.light.start}
              end={glass.light.end}
              style={styles.backButtonFill}
            >
              <BackIcon />
            </LinearGradient>
          </Pressable>
          <Text style={styles.headerLabel}>My foods</Text>
          {foods && foods.length > 0 ? (
            <Pressable
              onPress={openAddFood}
              accessibilityRole="button"
              accessibilityLabel="Add a food"
              style={styles.addButton}
            >
              <PlusIcon />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {foodsQuery.isLoading ? (
          <View style={styles.state} accessibilityLabel="Loading your foods">
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : null}
        {foodsQuery.isError ? (
          <View style={styles.state}>
            <Text style={styles.error}>
              Couldn{"'"}t load your foods just now. Pull to refresh in a moment.
            </Text>
          </View>
        ) : null}
        {foods && foods.length === 0 ? (
          <View style={styles.emptyContent}>
            <View style={styles.emptyCenter}>
              <UtensilsIcon />
              <View>
                <Text style={styles.emptyTitle}>No custom foods yet</Text>
                <Text style={styles.emptyBody}>
                  Save your own recipes and staples with their macros. I{"'"}ll remember them in
                  Search and while logging.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openAddFood}
              accessibilityRole="button"
              accessibilityLabel="Add a food"
              style={styles.emptyAction}
            >
              <PlusIcon />
              <Text style={styles.emptyActionText}>Add a food</Text>
            </Pressable>
          </View>
        ) : null}
        {foods && foods.length > 0 ? (
          <>
            <Text style={styles.subtitle}>Yours, kept separate from the shared catalog.</Text>
            <GlassCard
              variant="light"
              radius={radii.planMealList}
              padded={false}
              style={styles.listCard}
            >
              {foods.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.row, index < foods.length - 1 && styles.rowBorder]}
                >
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMacro}>{macroLine(item)}</Text>
                </View>
              ))}
            </GlassCard>
            <Text style={styles.footer}>
              {foods.length} {foods.length === 1 ? 'food' : 'foods'} · only you can see these
            </Text>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  backButtonFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { ...textStyle('afterSnapEyebrow'), color: colors.ink45 },
  headerSpacer: { width: componentSizes.dietHeaderControl },
  addButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  subtitle: { ...textStyle('sheetSubtitle'), color: colors.ink55, marginTop: spacing.lg },
  listCard: { marginTop: spacing.lg },
  row: { paddingVertical: spacing.ml, paddingHorizontal: spacing.sheetTitleGap },
  rowBorder: {
    borderBottomWidth: componentSizes.hairline / 2,
    borderBottomColor: withAlpha(colors.ink, 0.1),
  },
  rowTitle: { ...textStyle('myFoodsRowTitle'), color: colors.ink },
  rowMacro: { ...textStyle('usualFooter'), color: colors.ink55, marginTop: spacing.xs },
  footer: {
    ...textStyle('wellnessStepReason'),
    color: colors.ink45,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { ...textStyle('sourceQuietBody'), color: colors.ink55, textAlign: 'center' },
  emptyContent: { flex: 1, justifyContent: 'space-between' },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emptyTitle: { ...textStyle('myFoodsEmptyTitle'), color: colors.ink, textAlign: 'center' },
  emptyBody: {
    ...textStyle('sourceQuietBody'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: componentSizes.myFoodsEmptyBodyMaxWidth,
  },
  emptyAction: {
    minHeight: componentSizes.myFoodsAddButtonHeight,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyActionText: { ...textStyle('button'), color: colors.white },
});
