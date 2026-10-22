import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { usePillarSelectionStore, useProfileQuery } from '@/features/auth';
import { useFitnessProfileQuery } from '@/features/fitness';
import { useSourcesQuery } from '@/features/home';
import { useDietProfileQuery } from '@/features/onboarding';
import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';
import { BackButton } from '@/shared/components/BackButton';
import {
  checkInStyleLabel,
  connectedSourcesSummary,
  dietPillarSummary,
  fitnessPillarSummary,
  formatGoalSummary,
  membershipSummary,
  wellnessPillarSummary,
} from '@/features/profile/lib/profileCopy';
import { useWellnessProfileQuery } from '@/features/wellness';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, glass, radii, spacing, typography } from '@/shared/theme/tokens';

function PillarRow({ label, summary }: { label: string; summary: string | null }) {
  if (!summary) return null;
  return (
    <GlassCard variant="light" radius={radii.md} padded={false}>
      <View style={styles.row}>
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSummary}>{summary}</Text>
        </View>
        <Svg
          width={componentSizes.profilePillarChevron}
          height={componentSizes.profilePillarChevron}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d="M9 18l6-6-6-6"
            stroke={colors.ink55}
            strokeWidth={componentSizes.planHeaderStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </GlassCard>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const activePillars = usePillarSelectionStore((state) => state.activePillars);
  const profile = useProfileQuery();
  const diet = useDietProfileQuery();
  const fitness = useFitnessProfileQuery();
  const wellness = useWellnessProfileQuery();
  const sources = useSourcesQuery();
  if (profile.isLoading)
    return (
      <View style={styles.loading}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={colors.ink45} />
      </View>
    );
  const user = profile.data;
  if (!user)
    return (
      <View style={styles.loading}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <Text style={styles.rowSummary}>Unable to load your profile.</Text>
      </View>
    );
  const goal = formatGoalSummary(diet.data?.weight_kg ?? null, diet.data?.target_weight_kg ?? null);
  const checkIn = checkInStyleLabel(wellness.data?.check_in_style ?? '');
  const sourcesSummary = sources.isError
    ? 'Unable to load connected sources.'
    : connectedSourcesSummary(sources.data ?? []);
  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.eyebrow}>You</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.identity}>
          <LinearGradient
            colors={glass.profileAvatar.gradient}
            start={glass.profileAvatar.start}
            end={glass.profileAvatar.end}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user.first_name.slice(0, 1).toUpperCase()}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.name}>{user.first_name}</Text>
            <Text style={styles.membership}>{membershipSummary(user.created_at)}</Text>
          </View>
        </View>
        {goal ? (
          <GlassCard variant="dietHero" radius={radii.dietNextMeal}>
            <Text style={styles.goalLabel}>The goal</Text>
            <Text style={styles.goal}>{goal}</Text>
          </GlassCard>
        ) : null}
        <View style={styles.rows}>
          {activePillars.includes('diet') ? (
            <PillarRow
              label="Diet"
              summary={dietPillarSummary(
                diet.data?.diet_type ?? null,
                diet.data?.daily_calories ?? 0,
              )}
            />
          ) : null}
          {activePillars.includes('fitness') ? (
            <PillarRow
              label="Fitness"
              summary={fitnessPillarSummary(
                fitness.data?.fitness_goal ?? '',
                fitness.data?.training_places ?? [],
                fitness.data?.sports ?? [],
              )}
            />
          ) : null}
          {activePillars.includes('wellness') ? (
            <PillarRow
              label="Wellness"
              summary={wellnessPillarSummary(
                wellness.data?.wellness_focus ?? '',
                wellness.data?.hide_numbers ?? false,
              )}
            />
          ) : null}
        </View>
        {activePillars.includes('wellness') && checkIn ? (
          <GlassCard variant="light" radius={radii.ml}>
            <Text style={styles.checkinLabel}>Check-ins</Text>
            <View style={styles.pills}>
              <Text style={styles.pill}>{checkIn}</Text>
              <Text style={styles.pill}>Plain words, no scores</Text>
              <Text style={styles.pill}>Never red, never guilt</Text>
            </View>
          </GlassCard>
        ) : null}
        <GlassCard variant="usualNote" radius={radii.md} padded={false}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Connected</Text>
              <Text style={styles.rowSummary}>{sourcesSummary}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage"
              onPress={() => router.push('/profile/manage-sources')}
              style={styles.manageShadow}
            >
              <LinearGradient
                colors={glass.afterSnapNav.gradient}
                start={glass.afterSnapNav.start}
                end={glass.afterSnapNav.end}
                style={styles.manage}
              >
                <Text style={styles.manageText}>Manage</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </GlassCard>
        <AccountActionsSection />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="What Coreo knows about me"
          onPress={() => router.push('/profile/notebook')}
          style={styles.knowledgeGlow}
        >
          <LinearGradient
            colors={glass.chipSelected.gradient}
            start={glass.chipSelected.start}
            end={glass.chipSelected.end}
            style={styles.knowledge}
          >
            <Text style={styles.knowledgeText}>What Coreo knows about me</Text>
            <View style={styles.knowledgeArrow}>
              <Svg
                width={componentSizes.replaceBackIcon}
                height={componentSizes.replaceBackIcon}
                viewBox="0 0 24 24"
                fill="none"
              >
                <Path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke={colors.white}
                  strokeWidth={componentSizes.planHeaderStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </LinearGradient>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: spacing.lg },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  eyebrow: { ...typography.afterSnapEyebrow, color: colors.ink45 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  avatar: {
    alignItems: 'center',
    borderColor: glass.profileAvatar.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: componentSizes.profileAvatar,
    justifyContent: 'center',
    shadowColor: glass.profileAvatar.shadowColor,
    shadowOffset: { width: 0, height: spacing.ml },
    shadowOpacity: 1,
    shadowRadius: componentSizes.profileAvatarShadowRadius,
    width: componentSizes.profileAvatar,
  },
  avatarText: { ...typography.profileAvatar, color: colors.onNight },
  name: { ...typography.rightNowHeadline, color: colors.ink },
  membership: { ...typography.usualRowSubtitle, color: colors.ink55 },
  goalLabel: { ...typography.wellnessCardLabel, color: colors.usualOnNightMuted },
  goal: { ...typography.rightNowCue, color: colors.onNight, marginTop: spacing.sliderCaptionGap },
  rows: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: componentSizes.profileRowMinHeight,
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.fieldPadY,
  },
  rowLabel: { ...typography.mealReviewRowTitle, color: colors.ink },
  rowSummary: { ...typography.wellnessStepReason, color: colors.ink50, marginTop: spacing.xs },
  checkinLabel: { ...typography.wellnessCardLabel, color: colors.label },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sliderCaptionGap,
    marginTop: spacing.sm,
  },
  pill: {
    ...typography.usualRowSubtitle,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    color: colors.ink,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageShadow: {
    borderRadius: radii.dietWeightChip,
    shadowColor: glass.afterSnapNav.shadowColor,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
  },
  manage: {
    alignItems: 'center',
    borderColor: glass.afterSnapNav.border,
    borderRadius: radii.dietWeightChip,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: componentSizes.profileManageMinHeight,
    paddingHorizontal: spacing.md,
  },
  manageText: { ...typography.mealReviewFix, color: colors.ink60 },
  knowledgeGlow: {
    borderRadius: radii.pill,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.dietLogPillGlowRadius,
  },
  knowledge: {
    alignItems: 'center',
    borderColor: glass.chipSelected.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: componentSizes.profileKnowledgeMinHeight,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    shadowColor: glass.chipSelected.shadowColor,
    shadowOffset: { width: 0, height: spacing.lg },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietActionShadowRadius,
  },
  knowledgeText: { ...typography.afterSnapMealTitle, color: colors.ink },
  knowledgeArrow: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    height: componentSizes.profileKnowledgeArrow,
    justifyContent: 'center',
    width: componentSizes.profileKnowledgeArrow,
  },
});
