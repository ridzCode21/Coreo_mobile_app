import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { useDietProfileQuery } from '@/features/onboarding';
import { todayISO, useFoodEntriesQuery } from '@/features/nutrition/api/nutritionApi';
import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';
import { MacroSummaryCard } from '@/features/nutrition/components/MacroSummaryCard';
import { NextMealCard } from '@/features/nutrition/components/NextMealCard';
import { ReassuranceStrip } from '@/features/nutrition/components/ReassuranceStrip';
import { formatWeightChip } from '@/features/nutrition/lib/dietHome';
import { normalizeMacroSummary, targetsFromProfile } from '@/features/nutrition/lib/macros';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

export default function DietHomeScreen() {
  const router = useRouter();
  const today = todayISO();
  const [sheetVisible, setSheetVisible] = useState(false);

  const profileQuery = useDietProfileQuery();
  const entriesQuery = useFoodEntriesQuery(today);
  const profile = profileQuery.data;
  const targets = profile ? targetsFromProfile(profile) : null;
  const consumed = normalizeMacroSummary(entriesQuery.data?.macro_summary);
  const weightChip = profile ? formatWeightChip(profile.weight_kg, profile.target_weight_kg) : null;
  const refreshing = Boolean(profileQuery.isRefetching || entriesQuery.isRefetching);

  const openLogSheet = () => setSheetVisible(true);
  const refresh = () => {
    void Promise.all([profileQuery.refetch(), entriesQuery.refetch()]);
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen
        background="transparent"
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
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
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </LinearGradient>
          </Pressable>

          <Text style={styles.eyebrow}>Diet</Text>

          {weightChip ? (
            <View style={styles.weightChip}>
              <Text style={styles.weightChipText}>{weightChip}</Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.headline}>
          <Text style={styles.headlineLead}>Carbs before 5.</Text>
          <Text style={styles.headlineSpace}> </Text>
          <Text style={styles.headlineAccent}>That&apos;s the whole game today.</Text>
        </View>

        <View style={styles.heroSection}>
          {profileQuery.isLoading || entriesQuery.isLoading ? (
            <ActivityIndicator color={colors.ink40} accessibilityLabel="Loading today's numbers" />
          ) : !profile || profileQuery.isError || !targets ? (
            <Text style={styles.softNote}>
              Couldn&apos;t load your targets just now. Pull to refresh in a moment.
            </Text>
          ) : entriesQuery.isError || !entriesQuery.data ? (
            <Text style={styles.softNote}>
              Couldn&apos;t load today&apos;s numbers. Pull to refresh.
            </Text>
          ) : (
            <MacroSummaryCard targets={targets} consumed={consumed} />
          )}
        </View>

        <View style={styles.cardSection}>
          <NextMealCard date={today} />
        </View>
        <View style={styles.cardSection}>
          <ReassuranceStrip />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={openLogSheet}
            accessibilityRole="button"
            accessibilityLabel="Log a meal"
          >
            <View testID="log-pill-glow" style={styles.logPillGlow}>
              <LinearGradient
                colors={glass.chipSelected.gradient}
                start={glass.chipSelected.start}
                end={glass.chipSelected.end}
                style={styles.logPill}
              >
                <Text style={styles.logPillText}>Log a meal</Text>
                <View style={styles.logPlus}>
                  <Svg
                    width={componentSizes.dietActionIcon}
                    height={componentSizes.dietActionIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M12 5v14M5 12h14"
                      stroke={colors.white}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </LinearGradient>
            </View>
          </Pressable>

          <Pressable
            onPress={openLogSheet}
            accessibilityRole="button"
            accessibilityLabel="Say what you ate"
          >
            <GlassCard variant="night" radius={radii.dietVoiceBar} padded={false}>
              <View style={styles.voiceBar}>
                <Text style={styles.voiceCopy}>Say what you ate. Five seconds</Text>
                <LinearGradient
                  colors={[withAlpha(colors.white, 0.28), withAlpha(colors.white, 0.1)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.voiceMic}
                >
                  <Svg
                    width={componentSizes.dietActionIcon}
                    height={componentSizes.dietActionIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Rect
                      x={9}
                      y={3}
                      width={6}
                      height={11}
                      rx={3}
                      stroke={colors.onNight}
                      strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
                    />
                    <Path
                      d="M5 11a7 7 0 0 0 14 0M12 18v3"
                      stroke={colors.onNight}
                      strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
                      strokeLinecap="round"
                    />
                  </Svg>
                </LinearGradient>
                <View style={styles.voiceSubmit}>
                  <Svg
                    width={componentSizes.dietActionIcon}
                    height={componentSizes.dietActionIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M12 19V5M6 11l6-6 6 6"
                      stroke={colors.ink}
                      strokeWidth={componentSizes.homeAskBarSendStrokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        </View>
      </Screen>

      <LogMealSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: componentSizes.dietScreenBottomClearance },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: withAlpha(colors.overlayInk, 0.12),
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    textAlign: 'center',
  },
  weightChip: {
    minWidth: componentSizes.dietHeaderControl,
    height: componentSizes.dietWeightChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.dietWeightChip,
    backgroundColor: withAlpha(colors.white, 0.5),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightChipText: {
    ...textStyle('weightChip'),
    color: colors.ink60,
  },
  headerSpacer: { width: componentSizes.dietHeaderControl },
  headline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.dietHeadlineTop,
  },
  headlineLead: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
  },
  headlineSpace: {
    ...textStyle('sheetTitle'),
  },
  headlineAccent: {
    ...textStyle('dietHeadlineAccent'),
    color: colors.ink,
  },
  heroSection: { marginTop: spacing.dietHeroTop },
  softNote: {
    ...textStyle('body'),
    color: colors.ink55,
  },
  cardSection: { marginTop: spacing.dietCardGap },
  actions: {
    gap: spacing.dietCardGap,
    marginTop: spacing.xxxl,
  },
  logPillGlow: {
    borderRadius: radii.dietLogPill,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.dietLogPillGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  logPill: {
    height: componentSizes.dietLogPillHeight,
    borderRadius: radii.dietLogPill,
    borderWidth: 1,
    borderColor: glass.chipSelected.border,
    paddingLeft: spacing.dietActionPaddingLeft,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: glass.chipSelected.shadowColor,
    shadowOffset: { width: 0, height: spacing.lg },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietActionShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  logPillText: {
    ...textStyle('buttonSm'),
    color: colors.ink,
  },
  logPlus: {
    width: componentSizes.dietLogPlus,
    height: componentSizes.dietLogPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  voiceBar: {
    height: componentSizes.dietVoiceBarHeight,
    paddingLeft: spacing.dietActionPaddingLeft,
    paddingRight: spacing.authResetFieldGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
  },
  voiceCopy: {
    ...textStyle('body'),
    color: withAlpha(colors.fog, 0.55),
    flex: 1,
  },
  voiceMic: {
    width: componentSizes.dietVoiceIconCircle,
    height: componentSizes.dietVoiceIconCircle,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSubmit: {
    width: componentSizes.dietVoiceIconCircle,
    height: componentSizes.dietVoiceIconCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: componentSizes.dietVoiceSubmitGlowRadius,
    elevation: componentSizes.dietElevation,
  },
});
