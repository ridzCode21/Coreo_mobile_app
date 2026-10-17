import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { useWindDownQuery } from '@/features/wellness/api/windDownApi';
import { GlassCard } from '@/shared/components/GlassCard';
import { PillarHeader } from '@/shared/components/PillarHeader';
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

const INTERVIEW_ROUTE = '/wellness-interview' as Href;

export default function WellnessHomeScreen() {
  const router = useRouter();
  const query = useWindDownQuery();
  const windDown = query.data?.wind_down;

  useEffect(() => {
    if (query.data && windDown === null) router.replace(INTERVIEW_ROUTE);
  }, [query.data, router, windDown]);

  if (query.isLoading || (!query.data && !query.isError)) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading tonight's wind-down" />
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <Text style={styles.error}>Something went wrong. Try again.</Text>
      </Screen>
    );
  }
  if (!windDown) return null;

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <PillarHeader
          eyebrow="Wellness"
          onBack={() => router.back()}
          trailing={
            <View style={styles.timePill}>
              <Text style={styles.timeText}>{windDown.clock}</Text>
            </View>
          }
        />
        <Text style={styles.headline}>{windDown.headline}</Text>
        <GlassCard
          variant="dietHero"
          radius={radii.xl}
          style={styles.windDownCard}
          contentPaddingVertical={spacing.sheetTitleGap}
          contentPaddingHorizontal={spacing.xl}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.windDownLabel}>{windDown.title}</Text>
            <Text style={styles.lightsOut}>Lights out {windDown.lights_out}</Text>
          </View>
          <View style={styles.steps}>
            {windDown.steps.map((step, index) => (
              <View key={`${step.time}:${step.text}`} style={styles.stepRow}>
                <View
                  style={[styles.stepDot, index === 0 ? styles.stepDotLit : styles.stepDotDim]}
                />
                <Text style={styles.stepText}>{`${step.time}, ${step.text}`}</Text>
                <Text style={styles.stepReason}>{step.reason}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardFooter}>{windDown.line}</Text>
        </GlassCard>
        <GlassCard
          variant="light"
          radius={radii.dietNextMeal}
          style={styles.reasonCard}
          contentPaddingVertical={spacing.lg}
          contentPaddingHorizontal={spacing.xl}
        >
          <Text style={styles.reasonLabel}>Why tonight matters</Text>
          <Text style={styles.reasonBody}>{windDown.reason}</Text>
        </GlassCard>
        {windDown.plain_words ? (
          <GlassCard
            variant="usualNote"
            radius={radii.md}
            style={styles.plainWordsCard}
            contentPaddingVertical={spacing.md}
            contentPaddingHorizontal={spacing.sheetTitleGap}
          >
            <Text style={styles.plainWords}>{windDown.plain_words}</Text>
          </GlassCard>
        ) : null}
        <View style={styles.actions}>
          <GlassCard variant="chipSelected" radius={radii.dietLogPill} padded={false}>
            <View style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>Start the wind-down</Text>
              <View style={styles.primaryIconCircle}>
                <Svg
                  width={componentSizes.wellnessActionIcon}
                  height={componentSizes.wellnessActionIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    stroke={colors.white}
                    strokeWidth={componentSizes.planRegenerateStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
          </GlassCard>
          <GlassCard variant="night" radius={radii.planAction} padded={false}>
            <View style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Something on your mind? Say it</Text>
              <View style={styles.secondaryIconCircle}>
                <Svg
                  width={componentSizes.fitnessActionPrimaryIcon}
                  height={componentSizes.fitnessActionPrimaryIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Rect
                    x="9"
                    y="3"
                    width="6"
                    height="11"
                    rx="3"
                    stroke={colors.ink}
                    strokeWidth={componentSizes.planRegenerateStrokeWidth}
                  />
                  <Path
                    d="M5 11a7 7 0 0 0 14 0M12 18v3"
                    stroke={colors.ink}
                    strokeWidth={componentSizes.planRegenerateStrokeWidth}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </View>
          </GlassCard>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  error: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
  timePill: {
    height: componentSizes.dietWeightChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.dietWeightChip,
    backgroundColor: withAlpha(colors.white, 0.5),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { ...textStyle('weightChip'), color: colors.ink60 },
  headline: {
    ...textStyle('wellnessHeadline'),
    color: colors.ink,
    marginTop: spacing.sheetTitleGap,
  },
  windDownCard: { marginTop: spacing.ml },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  windDownLabel: { ...textStyle('wellnessCardLabel'), color: colors.fitnessOnNight50 },
  lightsOut: { ...textStyle('wellnessStepReason'), color: colors.fitnessOnNight50 },
  steps: { gap: spacing.ms, marginTop: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: componentSizes.wellnessStepDot,
    height: componentSizes.wellnessStepDot,
    borderRadius: radii.pill,
  },
  stepDotLit: { backgroundColor: colors.white, ...shadows.fitnessActionSecondary },
  stepDotDim: { backgroundColor: withAlpha(colors.white, 0.4) },
  stepText: { ...textStyle('wellnessStep'), color: withAlpha(colors.fog, 0.8), flex: 1 },
  stepReason: { ...textStyle('wellnessStepReason'), color: withAlpha(colors.fog, 0.45) },
  cardFooter: {
    ...textStyle('wellnessCardFooter'),
    color: colors.usualOnNightMuted,
    marginTop: spacing.md,
  },
  reasonCard: { marginTop: spacing.md },
  reasonLabel: { ...textStyle('readingCardLabel'), color: colors.label },
  reasonBody: { ...textStyle('small'), color: colors.ink70, marginTop: spacing.sliderCaptionGap },
  plainWordsCard: { marginTop: spacing.md },
  plainWords: { ...textStyle('usualFooter'), color: colors.ink65 },
  actions: { gap: spacing.md, marginTop: spacing.xxl },
  primaryAction: {
    height: componentSizes.wellnessPrimaryActionHeight,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryActionText: { ...textStyle('buttonSm'), color: colors.ink },
  primaryIconCircle: {
    width: componentSizes.wellnessPrimaryIconCircle,
    height: componentSizes.wellnessPrimaryIconCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fitnessActionPrimary,
  },
  secondaryAction: {
    height: componentSizes.wellnessSecondaryActionHeight,
    paddingLeft: spacing.portionReadoutGap,
    paddingRight: spacing.authResetFieldGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
  },
  secondaryActionText: { ...textStyle('bodySm'), color: colors.usualOnNightMuted, flex: 1 },
  secondaryIconCircle: {
    width: componentSizes.wellnessSecondaryIconCircle,
    height: componentSizes.wellnessSecondaryIconCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fitnessActionSecondary,
  },
});
