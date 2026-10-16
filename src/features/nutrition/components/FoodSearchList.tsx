import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ApiError } from '@/shared/api/errors';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import { useFoodSearchQuery } from '@/features/nutrition/api/nutritionApi';
import { isCatalogFoodSource } from '@/features/nutrition/lib/foodSource';
import type { FoodItem } from '@/shared/types/food';

type FoodSearchListProps = {
  query: string;
  onPick: (item: FoodItem) => void;
  showSourceLabel?: boolean;
};

/**
 * Results for the "Describe it" search path (14b), driven by the sheet's text field. Calm states
 * only — a food-DB outage (503) reads as a gentle nudge to describe it manually, never a red error
 * (design-system §10). The empty/short-query case renders nothing (the tiles stay visible).
 */
export function FoodSearchList({ query, onPick, showSourceLabel = false }: FoodSearchListProps) {
  const { data, isFetching, isError, error } = useFoodSearchQuery(query);

  if (query.trim().length < 2) return null;

  const isServiceDown = error instanceof ApiError && error.status === 503;

  return (
    <View style={styles.container}>
      {isFetching && !data ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color={colors.ink40} />
          <Text style={styles.stateText}>Looking that up…</Text>
        </View>
      ) : null}

      {isError ? (
        <Text style={styles.stateText}>
          {isServiceDown
            ? "That lookup's down for a moment — type it out instead."
            : "Couldn't search just now — type it out instead."}
        </Text>
      ) : null}

      {data?.length === 0 && !isFetching ? (
        <Text style={styles.stateText}>
          Nothing matched. Type it out and I&apos;ll do the math.
        </Text>
      ) : null}

      {data?.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPick(item)}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${item.name}`}
          style={styles.resultRow}
        >
          {showSourceLabel ? (
            <>
              <View style={styles.resultCopy}>
                <Text style={styles.screenResultName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.screenResultMeta}>
                    {Math.round(item.calories_per_100g)} kcal / 100g
                  </Text>
                  {isCatalogFoodSource(item.source) ? (
                    <Text style={styles.sourceLabel}>OpenFoodFacts</Text>
                  ) : null}
                </View>
              </View>
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
            </>
          ) : (
            <>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.resultMeta}>
                {Math.round(item.calories_per_100g)} kcal / 100g
              </Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stateText: {
    ...textStyle('bodySm'),
    color: colors.ink45,
    paddingVertical: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: withAlpha(colors.white, 0.45),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.6),
    gap: spacing.md,
  },
  resultName: {
    ...textStyle('body'),
    color: colors.ink,
    flex: 1,
  },
  screenResultName: { ...textStyle('planMealNameNext'), color: colors.ink },
  resultCopy: { flex: 1 },
  resultMeta: {
    ...textStyle('usualRowSubtitle'),
    color: colors.ink45,
  },
  screenResultMeta: {
    ...textStyle('usualRowSubtitle'),
    color: colors.ink55,
  },
  resultDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sliderCaptionGap,
    marginTop: spacing.xs,
  },
  sourceLabel: {
    ...textStyle('dockLabelActive'),
    color: colors.ink50,
    backgroundColor: withAlpha(colors.white, 0.6),
    borderColor: withAlpha(colors.white, 0.75),
    borderWidth: componentSizes.hairline,
    borderRadius: radii.foodSourceBadge,
    paddingHorizontal: spacing.headerLogoGap,
    paddingVertical: spacing.xs / 2,
  },
});
