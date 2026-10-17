import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { useFitnessProfileQuery } from '@/features/fitness/api/fitnessProfileApi';
import { useTrainingWeekQuery } from '@/features/fitness/api/trainingWeekApi';
import { FitnessHeader } from '@/features/fitness/components/FitnessHeader';
import { TrainingSessionCard } from '@/features/fitness/components/TrainingSessionCard';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  shadows,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

const INTERVIEW_ROUTE = '/fitness-interview' as Href;
const WEEK_ROUTE = '/fitness/week' as Href;

export default function FitnessHomeScreen() {
  const router = useRouter();
  const profileQuery = useFitnessProfileQuery();
  const profileComplete = Boolean(profileQuery.data?.fitness_interview_complete);
  const trainingWeekQuery = useTrainingWeekQuery(profileComplete);
  const trainingWeek = trainingWeekQuery.data?.training_week;

  useEffect(() => {
    if (profileQuery.data && !profileQuery.data.fitness_interview_complete) {
      router.replace(INTERVIEW_ROUTE);
    }
  }, [profileQuery.data, router]);

  useEffect(() => {
    if (profileComplete && trainingWeekQuery.data && trainingWeek === null) {
      router.replace(INTERVIEW_ROUTE);
    }
  }, [profileComplete, router, trainingWeek, trainingWeekQuery.data]);

  if (profileQuery.isLoading || (!profileQuery.data && !profileQuery.isError)) {
    return <LoadingState label="Loading fitness profile" />;
  }
  if (profileQuery.isError) return <ErrorState />;
  if (!profileComplete) return null;
  if (trainingWeekQuery.isLoading || (!trainingWeekQuery.data && !trainingWeekQuery.isError)) {
    return <LoadingState label="Loading training week" />;
  }
  if (trainingWeekQuery.isError) return <ErrorState />;
  if (!trainingWeek) return null;

  const today = trainingWeek.today;
  const showSession = Boolean(today && today.key !== 'sport' && today.exercises.length > 0);

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <FitnessHeader
          eyebrow="Fitness"
          onBack={() => router.back()}
          trailing={
            <Pressable
              onPress={() => router.push(WEEK_ROUTE)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${trainingWeek.position.label}`}
              hitSlop={spacing.authResetFieldGap}
              style={styles.positionChip}
            >
              <Text style={styles.positionText}>{trainingWeek.position.label}</Text>
            </Pressable>
          }
        />
        <Text style={styles.headline}>
          {today?.name ?? 'Rest day. Nothing planned — recovery is part of the plan.'}
        </Text>
        {showSession && today ? (
          <View style={styles.sessionCard}>
            <TrainingSessionCard session={today} />
          </View>
        ) : null}
        {today?.lighter_note ? (
          <GlassCard
            variant="light"
            radius={radii.dietNextMeal}
            style={styles.lighterCard}
            contentPaddingVertical={spacing.lg}
            contentPaddingHorizontal={spacing.xl}
          >
            <Text style={styles.lighterLabel}>Why today is lighter</Text>
            <Text style={styles.lighterBody}>{today.lighter_note}</Text>
          </GlassCard>
        ) : null}
        {today ? (
          <View style={styles.actions}>
            {today.exercises.length > 0 ? (
              <GlassCard variant="chipSelected" radius={radii.dietLogPill} padded={false}>
                <View style={styles.primaryAction}>
                  <Text style={styles.primaryActionText}>Start session</Text>
                  <View style={styles.playCircle}>
                    <Svg
                      width={componentSizes.fitnessActionPrimaryIcon}
                      height={componentSizes.fitnessActionPrimaryIcon}
                      viewBox="0 0 24 24"
                    >
                      <Path d="M8 5v14l11-7z" fill={colors.white} />
                    </Svg>
                  </View>
                </View>
              </GlassCard>
            ) : null}
            <GlassCard variant="night" radius={radii.planAction} padded={false}>
              <View style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Already moved today? Tell me</Text>
                <View style={styles.micCircle}>
                  <Svg
                    width={componentSizes.fitnessActionPrimaryIcon}
                    height={componentSizes.fitnessActionPrimaryIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Rect
                      x={9}
                      y={3}
                      width={6}
                      height={11}
                      rx={3}
                      stroke={colors.ink}
                      strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
                    />
                    <Path
                      d="M5 11a7 7 0 0 0 14 0M12 18v3"
                      stroke={colors.ink}
                      strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
              </View>
            </GlassCard>
          </View>
        ) : null}
      </Screen>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
      <ActivityIndicator color={colors.ink45} accessibilityLabel={label} />
    </Screen>
  );
}

function ErrorState() {
  return (
    <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
      <Text style={styles.error}>Something went wrong. Try again.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  error: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
  positionChip: {
    minWidth: componentSizes.dietHeaderControl,
    height: componentSizes.dietWeightChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.mealDetailChip,
    backgroundColor: withAlpha(colors.white, 0.5),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: { ...textStyle('weightChip'), color: colors.ink60 },
  headline: { ...textStyle('sheetTitle'), color: colors.ink, marginTop: spacing.sheetTitleGap },
  sessionCard: { marginTop: spacing.ml },
  lighterCard: { marginTop: spacing.md },
  lighterLabel: { ...textStyle('readingCardLabel'), color: colors.label },
  lighterBody: { ...textStyle('small'), color: colors.ink70, marginTop: spacing.sliderCaptionGap },
  actions: { gap: spacing.md, marginTop: spacing.ml },
  primaryAction: {
    height: componentSizes.dietLogPillHeight,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryActionText: { ...textStyle('buttonSm'), color: colors.ink },
  playCircle: {
    ...shadows.fitnessActionPrimary,
    width: componentSizes.dietLogPlus,
    height: componentSizes.dietLogPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    height: componentSizes.sheetControlHeight,
    paddingLeft: spacing.portionReadoutGap,
    paddingRight: spacing.authResetFieldGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
  },
  secondaryActionText: { ...textStyle('bodySm'), color: colors.usualOnNightMuted, flex: 1 },
  micCircle: {
    ...shadows.fitnessActionSecondary,
    width: componentSizes.sheetVoiceButton,
    height: componentSizes.sheetVoiceButton,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
