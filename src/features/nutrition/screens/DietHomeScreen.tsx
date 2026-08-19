import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/shared/components/Screen';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useDietProfileQuery } from '@/features/onboarding';
import {
  todayISO,
  useDeleteFoodEntryMutation,
  useFoodEntriesQuery,
} from '@/features/nutrition/api/nutritionApi';
import { groupEntriesByMeal, targetsFromProfile } from '@/features/nutrition/lib/macros';
import { MacroSummaryCard } from '@/features/nutrition/components/MacroSummaryCard';
import { FoodEntryRow } from '@/features/nutrition/components/FoodEntryRow';
import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';
import type { MealType } from '@/shared/types/food';

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const EMPTY_SUMMARY = { calories_in: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/**
 * Diet home (14a) — the day's calorie budget + macros + logged entries, and the entry point to
 * logging. Driven by `GET /food/entries/` (entries + macro summary) and the committed diet profile
 * (daily targets); see design spec §6/F-N5. The Layer-2 "Next meal" planned-meal card and the
 * `78 → 72` weight chip are intentionally not here yet (marked below) — not faked.
 */
export default function DietHomeScreen() {
  const today = todayISO();
  const [sheetVisible, setSheetVisible] = useState(false);

  const profileQuery = useDietProfileQuery();
  const entriesQuery = useFoodEntriesQuery(today);
  const deleteEntry = useDeleteFoodEntryMutation(today);

  const isLoading = profileQuery.isLoading || entriesQuery.isLoading;

  const targets = profileQuery.data ? targetsFromProfile(profileQuery.data) : null;
  const consumed = entriesQuery.data?.macro_summary ?? EMPTY_SUMMARY;
  const entries = entriesQuery.data?.entries ?? [];
  const sections = groupEntriesByMeal(entries);

  return (
    <View style={styles.root}>
      <LinearGradient
        // Static day-ramp atmosphere. Time-aware atmosphere (design-system §1 law 1) is a later
        // decorative enhancement, not required for Layer 1.
        colors={[colors.zenith, colors.day, colors.air]}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent">
        <Text style={styles.eyebrow}>Diet</Text>
        {/* Two-weight headline treatment matching the design (pageTitle: light lead + medium
            accent, design-system §2). NOTE: the copy is a static stand-in — the design's dynamic
            coaching line ("Carbs before 5…") comes from the AI coaching layer (Layer 2); there's no
            engine to compute it yet, so this renders a fixed on-brand line in the right style. */}
        <Text style={styles.headline}>
          Carbs before 5.{' '}
          <Text style={styles.headlineAccent}>That&apos;s the whole game today.</Text>
        </Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink40} />
          </View>
        ) : (
          <>
            {targets ? (
              <MacroSummaryCard targets={targets} consumed={consumed} />
            ) : (
              <Text style={styles.softNote}>
                Couldn&apos;t load your targets just now. Pull to refresh in a moment.
              </Text>
            )}

            {/* LAYER 2 (F-N3/F-N5): the "Next meal · before 1 PM" planned-meal card and the
                weight-trend chip go here, fed by the meal-plan API (§12). Deliberately omitted —
                not faked — until the meal-plan cycle. */}

            <View style={styles.listSection}>
              {sections.length === 0 ? (
                <Text style={styles.emptyText}>
                  Nothing logged yet. Whenever you eat, tell me — five seconds.
                </Text>
              ) : (
                sections.map((section) => (
                  <View key={section.meal} style={styles.mealGroup}>
                    <Text style={styles.mealHeader}>{MEAL_LABEL[section.meal]}</Text>
                    {section.entries.map((entry) => (
                      <FoodEntryRow
                        key={entry.id}
                        entry={entry}
                        onDelete={(target) => deleteEntry.mutate(target.id)}
                      />
                    ))}
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <Pressable
          onPress={() => setSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Log a meal"
          style={styles.logPill}
        >
          <Text style={styles.logPillText}>Log a meal</Text>
          <View style={styles.logPlus}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
        </Pressable>
      </Screen>

      <LogMealSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  headline: {
    ...textStyle('pageTitle'),
    color: colors.ink,
    marginBottom: spacing.xxl,
  },
  headlineAccent: {
    fontFamily: fontFamily.poppins500,
    color: colors.ink,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  softNote: {
    ...textStyle('body'),
    color: colors.ink45,
  },
  listSection: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  mealGroup: {
    gap: spacing.sm,
  },
  mealHeader: {
    ...textStyle('label'),
    color: colors.ink45,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...textStyle('body'),
    color: colors.ink45,
  },
  logPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.pill,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xxxl,
  },
  logPillText: {
    ...textStyle('bodyLg'),
    color: colors.ink,
  },
  logPlus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.coreBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
