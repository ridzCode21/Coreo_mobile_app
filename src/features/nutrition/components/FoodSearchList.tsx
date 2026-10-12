import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useFoodSearchQuery } from '@/features/nutrition/api/nutritionApi';
import type { FoodItem } from '@/shared/types/food';

type FoodSearchListProps = {
  query: string;
  onPick: (item: FoodItem) => void;
};

/**
 * Results for the "Describe it" search path (14b), driven by the sheet's text field. Calm states
 * only — a food-DB outage (503) reads as a gentle nudge to describe it manually, never a red error
 * (design-system §10). The empty/short-query case renders nothing (the tiles stay visible).
 */
export function FoodSearchList({ query, onPick }: FoodSearchListProps) {
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
          <Text style={styles.resultName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.resultMeta}>{Math.round(item.calories_per_100g)} kcal / 100g</Text>
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
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: spacing.md,
  },
  resultName: {
    ...textStyle('body'),
    color: colors.ink,
    flex: 1,
  },
  resultMeta: {
    ...textStyle('caption'),
    color: colors.ink45,
  },
});
