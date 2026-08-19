import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { WaveChart } from '@/shared/components/WaveChart';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';

/** Promise — the last beat of the interview, right before the calibrating payoff
 * (onboarding-v2-flow-plan.md §4: kept from the old flow, moved to sit just before calibrating
 * instead of just before signup, since signup itself moved to the very end). The design's footer
 * is a pair of small pills ("Deal" primary + "Why dashed?" secondary), not the full-width
 * night-glass bar used elsewhere. "Why dashed?" expands an inline explanation instead of
 * navigating away (the design shows it as a secondary pill, not a link to another screen). */
export default function PromiseScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const [expanded, setExpanded] = useState(false);

  const goNext = () => {
    completeStep('promise');
    const next = nextFlowStep('promise', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('promise', draft)}
      title={
        <Text style={onboardingTitleStyles.base}>
          One promise <Text style={onboardingTitleStyles.emphasis}>before we begin.</Text>
        </Text>
      }
      subtitle="For the first few days your wave stays dashed while I learn you. I will never show you an invented number. When it turns solid, it's real."
      footer={
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => setExpanded((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="Why dashed?"
            accessibilityState={{ expanded }}
            style={styles.whyButton}
          >
            <Text style={styles.whyButtonText}>Why dashed?</Text>
          </Pressable>
          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel="Deal"
            style={styles.dealButton}
          >
            <Text style={styles.dealButtonText}>Deal</Text>
          </Pressable>
        </View>
      }
    >
      <GlassCard variant="night">
        <Text style={styles.eyebrow}>Calibrating</Text>
        <WaveChart progress={0.15} color={colors.onNight} style={styles.wave} />
        <View style={styles.captionRow}>
          <Text style={styles.caption}>Day 1</Text>
          <Text style={styles.caption}>Real by day 4</Text>
        </View>
      </GlassCard>

      {expanded ? (
        <Text style={styles.whyExplanation}>
          A number needs a few days of your real data before it means anything. Rather than guess, I
          mark it dashed and projected until I have enough of your own history to be honest about
          it.
        </Text>
      ) : null}
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...textStyle('label'),
    color: 'rgba(239,244,249,0.5)',
  },
  wave: {
    marginTop: spacing.sm,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  caption: {
    ...textStyle('micro'),
    color: 'rgba(239,244,249,0.42)',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  whyButton: {
    height: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  whyButtonText: {
    ...textStyle('body'),
    color: colors.ink60,
  },
  dealButton: {
    height: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    shadowColor: 'rgba(18,42,70,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  dealButtonText: {
    fontFamily: fontFamily.poppins500,
    fontSize: 13,
    color: colors.ink,
  },
  whyExplanation: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
