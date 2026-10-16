import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useWeeklyDietReviewQuery } from '@/features/nutrition/api/nutritionApi';
import {
  dayBarHeightPercent,
  formatCalories,
  formatWeekRange,
  latestTargetChange,
} from '@/features/nutrition/lib/weekReview';
import { ApiError } from '@/shared/api/errors';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import {
  colors,
  componentSizes,
  radii,
  sheetSkyGradient,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { WeeklyDietReview } from '@/shared/types/weeklyDietReview';

const FOOTER_COPY =
  "This lands Sunday evening. No streaks, no badges, just whether it's working and one thing to try.";

type HeaderProps = {
  dateRange?: string;
  onBack: () => void;
};

function Header({ dateRange, onBack }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back">
        <LinearGradient
          colors={[withAlpha(colors.white, 0.6), withAlpha(colors.white, 0.25)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backButton}
        >
          <Svg
            width={componentSizes.replaceBackIcon}
            height={componentSizes.replaceBackIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.ink80}
              strokeWidth={componentSizes.planHeaderStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </LinearGradient>
      </Pressable>
      <Text style={styles.eyebrow}>Week in review</Text>
      {dateRange ? (
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{dateRange}</Text>
        </View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

function Footer() {
  return (
    <GlassCard variant="usualNote" radius={radii.md} padded={false}>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{FOOTER_COPY}</Text>
      </View>
    </GlassCard>
  );
}

function ReviewContent({ review }: { review: WeeklyDietReview }) {
  const targetChange = latestTargetChange(review.target_changes);

  return (
    <>
      <View style={styles.headline}>
        <Text style={styles.headlineLead}>{review.headline}</Text>
        {review.subtitle ? (
          <>
            <Text style={styles.headlineLead}> </Text>
            <Text style={styles.headlineAccent}>{review.subtitle}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.heroSection}>
        <GlassCard variant="dietHero" radius={radii.xl} padded={false}>
          <View style={styles.heroContent}>
            <View style={styles.daysHeader}>
              <Text style={styles.daysEyebrow}>Days near target</Text>
              <Text style={styles.daysHint}>Mon to Sun</Text>
            </View>
            <View style={styles.bars}>
              {review.days.map((day) => (
                <View
                  key={day.date}
                  testID={`week-review-bar-${day.weekday}`}
                  accessibilityLabel={`${day.weekday}: ${day.calories_in} calories`}
                  style={[
                    styles.bar,
                    { height: `${dayBarHeightPercent(day)}%` },
                    day.on_target ? styles.barOnTarget : styles.barOffTarget,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.daysBody}>
              {review.adherence_line} {review.pattern_callout}
            </Text>
          </View>
        </GlassCard>
      </View>

      <View style={styles.cardSection}>
        <GlassCard variant="light" radius={radii.dietNextMeal} padded={false}>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>This week&apos;s call</Text>
            <Text style={styles.cardTitle}>{review.recommendation.title}</Text>
            <Text style={styles.cardDetail}>{review.recommendation.detail}</Text>
          </View>
        </GlassCard>
      </View>

      {targetChange ? (
        <View style={styles.cardSection}>
          <GlassCard variant="light" radius={radii.dietNextMeal} padded={false}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Target updated</Text>
              <View style={styles.targetRow}>
                <Text style={styles.targetValue}>{formatCalories(targetChange.new_calories)}</Text>
                <Text style={styles.targetUnit}>
                  kcal / day
                  {targetChange.previous_calories !== null
                    ? ` · was ${formatCalories(targetChange.previous_calories)}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.cardDetail}>{targetChange.note}</Text>
            </View>
          </GlassCard>
        </View>
      ) : null}

      <View style={styles.footerSpacer} />
      <Footer />
    </>
  );
}

export default function WeekInReviewScreen() {
  const router = useRouter();
  const reviewQuery = useWeeklyDietReviewQuery();
  const isNoReview =
    reviewQuery.isError &&
    reviewQuery.error instanceof ApiError &&
    reviewQuery.error.status === 404;

  const refresh = () => {
    void reviewQuery.refetch();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={sheetSkyGradient.colors}
        locations={sheetSkyGradient.locations}
        start={sheetSkyGradient.start}
        end={sheetSkyGradient.end}
        style={StyleSheet.absoluteFill}
      />
      <Screen
        background="transparent"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={reviewQuery.isRefetching} onRefresh={refresh} />
        }
      >
        <View style={styles.content}>
          <Header
            onBack={() => router.back()}
            dateRange={
              reviewQuery.data
                ? formatWeekRange(reviewQuery.data.week_start, reviewQuery.data.week_end)
                : undefined
            }
          />
          {reviewQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator
                color={colors.ink40}
                accessibilityLabel="Loading your week in review"
              />
            </View>
          ) : reviewQuery.data ? (
            <ReviewContent review={reviewQuery.data} />
          ) : (
            <View style={styles.stateContent}>
              <GlassCard variant="usualNote" radius={radii.md}>
                <Text style={styles.stateTitle}>
                  {isNoReview ? 'No review yet.' : 'A quiet pause.'}
                </Text>
                <Text style={styles.stateBody}>
                  {isNoReview
                    ? 'Your first week in review lands next Sunday evening, once a full week is logged.'
                    : "Couldn't load your week in review. Pull to refresh in a moment."}
                </Text>
              </GlassCard>
              <View style={styles.footerSpacer} />
              <Footer />
            </View>
          )}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.screenPadBottom },
  content: { flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: withAlpha(colors.overlayInk, 0.12),
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  headerSpacer: { width: componentSizes.dietHeaderControl },
  dateChip: {
    height: componentSizes.dietWeightChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.dietWeightChip,
    backgroundColor: withAlpha(colors.white, 0.5),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipText: { ...textStyle('weightChip'), color: colors.ink60 },
  headline: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.dietHeadlineTop },
  headlineLead: { ...textStyle('sheetTitle'), color: colors.ink },
  headlineAccent: { ...textStyle('dietHeadlineAccent'), color: colors.ink },
  heroSection: { marginTop: spacing.dietHeroTop },
  heroContent: {
    paddingVertical: spacing.dietHeroCardPaddingY,
    paddingHorizontal: spacing.dietCardPaddingX,
  },
  daysHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  daysEyebrow: { ...textStyle('weekReviewDaysEyebrow'), color: withAlpha(colors.onNight, 0.5) },
  daysHint: { ...textStyle('cardHint'), color: withAlpha(colors.onNight, 0.5) },
  bars: {
    height: componentSizes.weekReviewBarsHeight,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.ml,
  },
  bar: { flex: 1, borderRadius: radii.weekReviewBar },
  barOnTarget: {
    backgroundColor: withAlpha(colors.white, 0.85),
    shadowColor: withAlpha(colors.white, 0.5),
    shadowOpacity: 1,
    shadowRadius: spacing.ms,
  },
  barOffTarget: { backgroundColor: withAlpha(colors.white, 0.35) },
  daysBody: {
    ...textStyle('weekReviewDaysBody'),
    color: withAlpha(colors.onNight, 0.6),
    marginTop: spacing.md,
  },
  cardSection: { marginTop: spacing.dietCardGap },
  cardContent: {
    paddingVertical: spacing.dietCardPaddingY,
    paddingHorizontal: spacing.dietCardPaddingX,
  },
  cardLabel: { ...textStyle('readingCardLabel'), color: colors.label },
  cardTitle: {
    ...textStyle('nextMealTitle'),
    color: colors.ink,
    marginTop: spacing.dietNextMealTitleGap,
  },
  cardDetail: {
    ...textStyle('nextMealSubtitle'),
    color: colors.ink55,
    marginTop: spacing.dietNextMealSubtitleGap,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.dietNextMealTitleGap,
  },
  targetValue: { ...textStyle('weekReviewTargetValue'), color: colors.ink },
  targetUnit: { ...textStyle('nextMealSubtitle'), color: colors.ink55 },
  footerSpacer: { flexGrow: 1, minHeight: spacing.dietCardGap },
  footer: { paddingVertical: spacing.md, paddingHorizontal: spacing.dietReassurancePaddingX },
  footerText: { ...textStyle('reassuranceText'), color: colors.ink65 },
  stateContent: { flexGrow: 1, marginTop: spacing.dietHeroTop },
  stateTitle: { ...textStyle('nextMealTitle'), color: colors.ink },
  stateBody: {
    ...textStyle('reassuranceText'),
    color: colors.ink65,
    marginTop: spacing.dietNextMealSubtitleGap,
  },
});
