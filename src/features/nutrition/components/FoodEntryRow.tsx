import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type { FoodEntry } from '@/shared/types/food';

type FoodEntryRowProps = {
  entry: FoodEntry;
  onDelete: (entry: FoodEntry) => void;
};

/**
 * One logged entry in the Diet home day list — light-glass row: food name + a quiet macro line on
 * the left, calories on the right, and a subtle "Remove" affordance. Calm, never destructive-red
 * (design-system §10). Meal-section headers are rendered by the screen, not here.
 */
export function FoodEntryRow({ entry, onDelete }: FoodEntryRowProps) {
  return (
    <GlassCard variant="light" radius={radii.md} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.food_name}
          </Text>
          <Text style={styles.macros}>
            P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g · F{' '}
            {Math.round(entry.fat_g)}g
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.kcal}>{Math.round(entry.calories)} kcal</Text>
          <Pressable
            onPress={() => onDelete(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${entry.food_name}`}
            hitSlop={8}
            style={styles.remove}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...textStyle('bodyLg'),
    color: colors.ink,
  },
  macros: {
    ...textStyle('caption'),
    color: colors.ink45,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  kcal: {
    ...textStyle('bodyLg'),
    color: colors.ink,
  },
  remove: {
    paddingVertical: 2,
  },
  removeText: {
    ...textStyle('caption'),
    color: colors.ink40,
  },
});
