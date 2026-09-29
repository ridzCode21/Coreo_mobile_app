import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { PetalCluster } from '@/shared/components/PetalCluster';
import { Screen } from '@/shared/components/Screen';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { profileCompletion, targetQuality, useDietProfileQuery } from '@/features/onboarding';
import {
  targetsFromProfile,
  todayISO,
  useDailySummaryQuery,
  useUpdateWaterMutation,
} from '@/features/nutrition';

const COREO_ROUTE = '/core' as Href;
const DIET_ROUTE = '/diet' as Href;
const FITNESS_ROUTE = '/fitness' as Href;
const WELLNESS_ROUTE = '/wellness' as Href;
const DIET_CONFIRM_ROUTE = '/diet/confirm?source=manual' as Href;

function formatNumber(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCalories(consumed: number, target?: number): string {
  if (!target || target <= 0) return `${formatNumber(consumed)} kcal`;
  return `${formatNumber(consumed)} / ${formatNumber(target)} kcal`;
}

function formatHydration(value: number): string {
  if (value >= 1000) {
    const liters = Math.round((value / 1000) * 10) / 10;
    return `${liters} L`;
  }
  return `${formatNumber(value)} ml`;
}

function formatSleep(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export default function CoreoHomeScreen() {
  const router = useRouter();
  const today = todayISO();
  const profileQuery = useDietProfileQuery();
  const summaryQuery = useDailySummaryQuery(today);
  const waterMutation = useUpdateWaterMutation(today);

  const isLoading = profileQuery.isLoading || summaryQuery.isLoading;
  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const log = summary?.daily_log;
  const targets = profile ? targetsFromProfile(profile) : null;
  const completion = profile ? profileCompletion(profile) : null;
  const quality = profile ? targetQuality(profile) : 'unavailable';

  const caloriesIn = log?.calories_in ?? 0;
  const waterMl = log?.water_ml ?? 0;
  const workoutSessions = log?.workout_sessions ?? 0;
  const mealLogged = Boolean(summary && summary.food_log_count > 0);
  const hasLoggedToday = mealLogged || waterMl > 0 || workoutSessions > 0;
  const hasSignals =
    waterMl > 0 || (log?.steps ?? 0) > 0 || log?.sleep_hours != null || log?.hrv != null;
  const hasInsight = false;
  const headline = hasInsight
    ? 'A pattern is starting to show.'
    : hasLoggedToday && (quality === 'estimated' || quality === 'confirmed')
      ? 'Today, your core is readable.'
      : hasLoggedToday
        ? "Here's where today stands."
        : 'Today starts here.';

  const addWater = () => {
    waterMutation.mutate(waterMl + 250);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.zenith, colors.day, colors.air]}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>Coreo</Text>
        <Text style={styles.greeting}>
          {headline.split(',')[0]}
          {headline.includes(',') ? (
            <>
              ,{' '}
              <Text style={styles.greetingAccent}>
                {headline.split(',').slice(1).join(',')}
              </Text>
            </>
          ) : null}
        </Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink45} />
          </View>
        ) : (
          <>
            <GlassCard variant="light" radius={radii.xl} style={styles.todayCard}>
              <Text style={styles.cardLabel}>Today</Text>
              <View style={styles.todayRows}>
                <TodayRow
                  label="Nutrition"
                  value={formatCalories(caloriesIn, targets?.calories)}
                  onPress={() => router.navigate(DIET_ROUTE)}
                />
                <TodayRow
                  label="Movement"
                  value={
                    workoutSessions > 0
                      ? `${workoutSessions} workout${workoutSessions === 1 ? '' : 's'}`
                      : 'Not logged yet'
                  }
                  onPress={() => router.navigate(FITNESS_ROUTE)}
                />
                <TodayRow
                  label="Hydration"
                  value={formatHydration(waterMl)}
                  onPress={() => router.navigate(WELLNESS_ROUTE)}
                />
              </View>
            </GlassCard>

            {completion && !completion.dietQuick ? (
              <Pressable
                onPress={() => router.navigate(DIET_ROUTE)}
                accessibilityRole="button"
                accessibilityLabel="Personalize your diet"
              >
                <GlassCard variant="light" radius={radii.xl} style={styles.contextCard}>
                  <Text style={styles.cardLabel}>Personalize your diet</Text>
                  <Text style={styles.contextTitle}>
                    3 quick things to improve your targets and future meal plans.
                  </Text>
                  <Text style={styles.softCopy}>Diet type · Activity · Foods to avoid</Text>
                  <Text style={styles.contextAction}>Finish in ~1 min</Text>
                </GlassCard>
              </Pressable>
            ) : null}

            <View style={styles.quickActions}>
              <Pressable
                onPress={() => router.push(DIET_CONFIRM_ROUTE)}
                accessibilityRole="button"
                accessibilityLabel="Log a meal"
                style={styles.actionPill}
              >
                <Text style={styles.actionText}>+ Log meal</Text>
              </Pressable>
              <Pressable
                onPress={() => router.navigate(FITNESS_ROUTE)}
                accessibilityRole="button"
                accessibilityLabel="Add workout"
                style={styles.actionPill}
              >
                <Text style={styles.actionText}>+ Add workout</Text>
              </Pressable>
            </View>

            {hasSignals ? (
              <GlassCard variant="light" radius={radii.xl} style={styles.signalCard}>
                <Text style={styles.cardLabel}>Signals</Text>
                <View style={styles.signalList}>
                  {waterMl > 0 ? <Signal label="Water" value={formatHydration(waterMl)} /> : null}
                  {(log?.steps ?? 0) > 0 ? (
                    <Signal label="Steps" value={formatNumber(log?.steps ?? 0)} />
                  ) : null}
                  {log?.sleep_hours != null ? (
                    <Signal label="Sleep" value={formatSleep(log.sleep_hours)} />
                  ) : null}
                  {log?.hrv != null ? <Signal label="HRV" value={`${log.hrv} ms`} /> : null}
                </View>
              </GlassCard>
            ) : hasLoggedToday ? (
              <GlassCard variant="light" radius={radii.xl} style={styles.signalCard}>
                <Text style={styles.cardLabel}>Signals</Text>
                <Text style={styles.emptySignalTitle}>No health signals yet.</Text>
                <Text style={styles.softCopy}>Add water or import health data.</Text>
                <View style={styles.signalActions}>
                  <Pressable
                    onPress={addWater}
                    disabled={waterMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Add water"
                    style={[styles.smallAction, waterMutation.isPending && styles.disabled]}
                  >
                    <Text style={styles.smallActionText}>+ Add water</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.navigate(WELLNESS_ROUTE)}
                    accessibilityRole="button"
                    accessibilityLabel="Import data"
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>Import data</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ) : null}

            <PetalCluster
              items={[
                {
                  id: 'diet',
                  label: 'Diet',
                  value: targets ? `${formatNumber(targets.calories)} kcal` : 'Open',
                  onPress: () => router.navigate(DIET_ROUTE),
                },
                {
                  id: 'fitness',
                  label: 'Fitness',
                  value: workoutSessions > 0 ? 'Logged' : 'Ready',
                  onPress: () => router.navigate(FITNESS_ROUTE),
                },
                {
                  id: 'wellness',
                  label: 'Wellness',
                  value: waterMl > 0 ? formatHydration(waterMl) : 'Open',
                  onPress: () => router.navigate(WELLNESS_ROUTE),
                },
                {
                  id: 'coreo',
                  label: 'Coreo',
                  value: 'Today',
                  active: true,
                  onPress: () => router.navigate(COREO_ROUTE),
                },
              ]}
            />
          </>
        )}
      </Screen>
    </View>
  );
}

function TodayRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={styles.todayRow}
    >
      <Text style={styles.todayLabel}>{label}</Text>
      <Text style={styles.todayValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Pressable>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.signal}>
      <Text style={styles.signalValue}>{value}</Text>
      <Text style={styles.signalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingBottom: 112,
  },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...textStyle('greeting'),
    color: colors.ink,
    marginBottom: spacing.xxl,
  },
  greetingAccent: {
    fontFamily: fontFamily.poppins500,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  todayCard: {
    marginBottom: spacing.lg,
  },
  cardLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  todayRows: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  todayRow: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  todayLabel: {
    ...textStyle('body'),
    color: colors.ink60,
  },
  todayValue: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  contextCard: {
    marginBottom: spacing.lg,
  },
  contextTitle: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    marginTop: spacing.xs,
  },
  softCopy: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    marginTop: spacing.xs,
  },
  contextAction: {
    ...textStyle('caption'),
    color: colors.ink,
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionPill: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...textStyle('body'),
    color: colors.ink,
  },
  signalCard: {
    marginBottom: spacing.xxl,
  },
  signalList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  signal: {
    minWidth: '30%',
    flex: 1,
  },
  signalValue: {
    ...textStyle('bodyLg'),
    color: colors.ink,
  },
  signalLabel: {
    ...textStyle('micro'),
    color: colors.ink45,
    marginTop: 2,
  },
  emptySignalTitle: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    marginTop: spacing.xs,
  },
  signalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  smallAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: {
    ...textStyle('caption'),
    color: colors.ink,
  },
  disabled: {
    opacity: 0.58,
  },
});
