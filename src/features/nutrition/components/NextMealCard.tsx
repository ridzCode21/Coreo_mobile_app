import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

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

const PLAN_ROUTE = '/diet/plan';

export function NextMealCard({ date }: NextMealCardProps) {
  const router = useRouter();
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Next meal · {MEAL_WINDOW_COPY[meal.meal_type]}</Text>
        <Pressable
          onPress={() => router.push(PLAN_ROUTE)}
          accessibilityRole="button"
          accessibilityLabel="See full plan"
        >
          <Text style={styles.linkText}>See full plan</Text>
        </Pressable>
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: {
    ...textStyle('readingCardLabel'),
    color: colors.label,
  },
  linkText: {
    ...textStyle('caption'),
    color: colors.ink,
    textDecorationLine: 'underline',
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
