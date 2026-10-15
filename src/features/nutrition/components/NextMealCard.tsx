import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useMealPlanQuery } from '@/features/nutrition/api/mealPlanApi';
import {
  MEAL_CLOSER_COPY,
  MEAL_WINDOW_COPY,
  nextPlannedMeal,
} from '@/features/nutrition/lib/dietHome';

type NextMealCardProps = {
  date: string;
};

export function NextMealCard({ date }: NextMealCardProps) {
  const planQuery = useMealPlanQuery(date);
  const plan = planQuery.data;
  const meal = plan?.status === 'ready' ? nextPlannedMeal(plan.meals) : null;

  if (!meal) return null;

  return (
    <GlassCard
      variant="light"
      radius={radii.dietNextMeal}
      contentPaddingVertical={spacing.dietCardPaddingY}
      contentPaddingHorizontal={spacing.dietCardPaddingX}
    >
      <Text style={styles.eyebrow}>Next meal · {MEAL_WINDOW_COPY[meal.meal_type]}</Text>
      <View style={styles.copy}>
        <Text style={styles.title}>{meal.name}</Text>
        <Text style={styles.subtitle}>
          {Math.round(meal.carbs_g)}g carbs, {MEAL_CLOSER_COPY[meal.meal_type]}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...textStyle('readingCardLabel'),
    color: colors.label,
  },
  copy: {
    marginTop: spacing.dietNextMealTitleGap,
  },
  title: {
    ...textStyle('nextMealTitle'),
    color: colors.ink,
  },
  subtitle: {
    ...textStyle('nextMealSubtitle'),
    color: colors.ink55,
    marginTop: spacing.dietNextMealSubtitleGap,
  },
});
