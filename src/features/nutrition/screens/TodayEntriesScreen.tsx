import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import {
  todayISO,
  useDeleteFoodEntryMutation,
  useFoodEntriesQuery,
} from '@/features/nutrition/api/nutritionApi';
import { FoodEntryRow } from '@/features/nutrition/components/FoodEntryRow';
import { groupEntriesByMeal } from '@/features/nutrition/lib/macros';
import { MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, glass, radii, spacing, textStyle } from '@/shared/theme/tokens';

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

export default function TodayEntriesScreen() {
  const router = useRouter();
  const date = todayISO();
  const entriesQuery = useFoodEntriesQuery(date);
  const deleteEntry = useDeleteFoodEntryMutation(date);
  const entries = entriesQuery.data?.entries;
  const refresh = () => {
    void entriesQuery.refetch();
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen
        background="transparent"
        contentContainerStyle={styles.screenContent}
        refreshControl={
          <RefreshControl refreshing={entriesQuery.isRefetching} onRefresh={refresh} />
        }
      >
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
          <Text style={styles.headerLabel}>Today&apos;s entries</Text>
          <View style={styles.headerSpacer} />
        </View>

        {entriesQuery.isLoading ? (
          <View style={styles.state} accessibilityLabel="Loading today's entries">
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : null}
        {entriesQuery.isError ? (
          <View style={styles.state}>
            <Text style={styles.error}>
              Couldn&apos;t load today&apos;s entries. Pull to refresh in a moment.
            </Text>
          </View>
        ) : null}
        {entries && entries.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.error}>Nothing logged yet today.</Text>
          </View>
        ) : null}
        {entries && entries.length > 0 ? (
          <View style={styles.entries}>
            {groupEntriesByMeal(entries).map((section) => (
              <View key={section.meal} style={styles.section}>
                <Text style={styles.sectionHeader}>{MEAL_LABEL[section.meal]}</Text>
                {section.entries.map((entry) => (
                  <FoodEntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={(selectedEntry) => deleteEntry.mutate(selectedEntry.id)}
                  />
                ))}
              </View>
            ))}
          </View>
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
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { ...textStyle('sourceQuietBody'), color: colors.ink55, textAlign: 'center' },
  entries: { marginTop: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionHeader: { ...textStyle('label'), color: colors.label, marginBottom: spacing.sm },
});
