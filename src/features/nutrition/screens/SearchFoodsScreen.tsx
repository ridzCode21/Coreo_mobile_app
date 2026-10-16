import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

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
import { FoodSearchList } from '@/features/nutrition/components/FoodSearchList';
import { scalePer100g } from '@/features/nutrition/lib/macros';
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

function SearchIcon() {
  return (
    <Svg
      width={componentSizes.mealReviewBackIcon}
      height={componentSizes.mealReviewBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Circle
        cx={11}
        cy={11}
        r={7}
        stroke={colors.ink50}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
      />
      <Path
        d="M21 21l-4.35-4.35"
        stroke={colors.ink50}
        strokeWidth={componentSizes.onboardingArrowStrokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function SearchFoodsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const pickFood = (item: FoodItem) => {
    const scaled = scalePer100g(
      {
        calories: item.calories_per_100g,
        protein_g: item.protein_g_per_100g,
        carbs_g: item.carbs_g_per_100g,
        fat_g: item.fat_g_per_100g,
      },
      100,
    );
    const params = new URLSearchParams({
      source: 'manual',
      prefill: JSON.stringify({ food_name: item.name, ...scaled }),
    });
    router.push(`/diet/confirm?${params.toString()}` as Href);
  };

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
          <Text style={styles.headerLabel}>Search</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchField}>
          <SearchIcon />
          <TextInput
            testID="food-search-input"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search foods"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <Text style={styles.hint}>Tap a result to log it.</Text>
        <View style={styles.results}>
          <FoodSearchList query={query} onPick={pickFood} showSourceLabel />
        </View>
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
  searchField: {
    minHeight: componentSizes.sheetControlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    backgroundColor: withAlpha(colors.white, 0.55),
    borderColor: withAlpha(colors.white, 0.7),
    borderWidth: componentSizes.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sheetTitleGap,
    marginTop: spacing.lg,
  },
  searchInput: { ...textStyle('inputValue'), color: colors.ink85, flex: 1, paddingVertical: 0 },
  hint: { ...textStyle('legal'), color: colors.ink45, marginTop: spacing.ms },
  results: { marginTop: spacing.md },
});
