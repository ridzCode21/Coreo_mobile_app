import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { PetalCluster } from '@/shared/components/PetalCluster';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, fontFamily, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';
import { useProfileQuery } from '@/features/auth';
import { useSourcesQuery } from '@/features/home/api/sourcesApi';
import { AskAnythingBar } from '@/features/home/components/AskAnythingBar';
import { CalibratingWaveCard } from '@/features/home/components/CalibratingWaveCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { ReadingYouCard } from '@/features/home/components/ReadingYouCard';
import { TodayScoreCard } from '@/features/home/components/TodayScoreCard';
import { timeOfDayGreeting } from '@/features/home/lib/greeting';
import { targetQuality, useDietProfileQuery } from '@/features/onboarding';
import { targetsFromProfile, todayISO, useDailySummaryQuery } from '@/features/nutrition';

const DIET_ROUTE = '/diet' as Href;
const FITNESS_ROUTE = '/fitness' as Href;
const WELLNESS_ROUTE = '/wellness' as Href;

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

export default function CoreoHomeScreen() {
  const router = useRouter();
  const now = new Date();
  const today = todayISO();
  const userProfileQuery = useProfileQuery();
  const isCalibrating = userProfileQuery.data?.wave === 'dashed';
  const calibrationDay = userProfileQuery.data?.calibration_day ?? null;
  const profileQuery = useDietProfileQuery();
  const summaryQuery = useDailySummaryQuery(today);

  const isLoading = profileQuery.isLoading || summaryQuery.isLoading;
  const firstName = userProfileQuery.data?.first_name.trim();
  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const log = summary?.daily_log;
  const targets = profile ? targetsFromProfile(profile) : null;
  const quality = profile ? targetQuality(profile) : 'unavailable';

  const caloriesIn = log?.calories_in ?? 0;
  const waterMl = log?.water_ml ?? 0;
  const workoutSessions = log?.workout_sessions ?? 0;
  const mealLogged = Boolean(summary && summary.food_log_count > 0);
  const hasLoggedToday = mealLogged || waterMl > 0 || workoutSessions > 0;
  const hasInsight = false;
  const headline = hasInsight
    ? 'A pattern is starting to show.'
    : hasLoggedToday && (quality === 'estimated' || quality === 'confirmed')
      ? 'Today, your core is readable.'
      : hasLoggedToday
        ? "Here's where today stands."
        : 'Today starts here.';

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <HomeHeader now={now} />
        {isCalibrating ? (
          <>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>
                Welcome in,
                {firstName ? (
                  <>
                    {' '}
                    <Text style={styles.greetingName}>{firstName}.</Text>
                  </>
                ) : null}
              </Text>
              <Text style={styles.greetingSubtitle}>
                Still reading you. The wave stays dashed until day 4.
              </Text>
            </View>

            <CalibratingWaveCard day={calibrationDay} />
            <ReadingYouSection />

            <Text style={styles.calibratingPillarIntro}>While I read, go meet your pillars.</Text>
            <View style={styles.calibratingPetals}>
              <PetalCluster
                items={[
                  {
                    id: 'wellness',
                    label: 'Wellness',
                    subLabel: '30 sec to set up',
                    onPress: () => router.navigate(WELLNESS_ROUTE),
                  },
                  {
                    id: 'fitness',
                    label: 'Fitness',
                    subLabel: '30 sec to set up',
                    onPress: () => router.navigate(FITNESS_ROUTE),
                  },
                  {
                    id: 'diet',
                    label: 'Diet',
                    subLabel: '30 sec to set up',
                    onPress: () => router.navigate(DIET_ROUTE),
                  },
                  {
                    id: 'core',
                    label: 'Core',
                    subLabel: 'Ready',
                    emphasized: true,
                  },
                ]}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>
                {timeOfDayGreeting(now)},
                {firstName ? (
                  <>
                    {' '}
                    <Text style={styles.greetingName}>{firstName}.</Text>
                  </>
                ) : null}
              </Text>
              <Text style={styles.greetingSubtitle}>{headline}</Text>
            </View>

            <TodayScoreCard now={now} />

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

                <PetalCluster
                  items={[
                    {
                      id: 'wellness',
                      label: 'Wellness',
                      onPress: () => router.navigate(WELLNESS_ROUTE),
                    },
                    {
                      id: 'fitness',
                      label: 'Fitness',
                      onPress: () => router.navigate(FITNESS_ROUTE),
                    },
                    {
                      id: 'diet',
                      label: 'Diet',
                      onPress: () => router.navigate(DIET_ROUTE),
                    },
                    {
                      id: 'core',
                      label: 'Core',
                      emphasized: true,
                    },
                  ]}
                />

                <AskAnythingBar />
              </>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

function ReadingYouSection() {
  const sourcesQuery = useSourcesQuery();
  return <ReadingYouCard sources={sourcesQuery.data ?? []} />;
}

type TodayRowProps = {
  label: string;
  value: string;
  onPress: () => void;
};

function TodayRow({ label, value, onPress }: TodayRowProps) {
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingBottom: 112,
  },
  greetingBlock: {
    marginTop: spacing.xl,
  },
  greeting: {
    ...textStyle('greeting'),
    color: colors.ink,
  },
  greetingName: {
    fontFamily: fontFamily.poppins400,
  },
  greetingSubtitle: {
    ...textStyle('greetingSubtitle'),
    color: colors.ink60,
    marginTop: spacing.sliderCaptionGap,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  calibratingPillarIntro: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink50,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  calibratingPetals: {
    marginTop: spacing.lg,
  },
  todayCard: {
    marginTop: spacing.lg,
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
    backgroundColor: withAlpha(colors.white, 0.38),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.52),
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  todayLabel: {
    ...textStyle('body'),
    color: colors.ink62,
  },
  todayValue: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
});
