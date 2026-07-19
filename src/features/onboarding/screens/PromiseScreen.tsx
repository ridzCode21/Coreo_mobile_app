import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import { OnboardingWaveStrip } from '@/features/onboarding/components/OnboardingWaveStrip';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

/** 7a·7 Promise — sets expectations before account creation. "Why dashed?" expands an inline
 * explanation instead of navigating away (the design shows it as a secondary pill, not a link to
 * another screen). */
export default function PromiseScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const [expanded, setExpanded] = useState(false);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('promise', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="promise"
      title={
        <Text style={onboardingTitleStyles.base}>
          One promise <Text style={onboardingTitleStyles.emphasis}>before we begin.</Text>
        </Text>
      }
      subtitle="For the first few days your wave stays dashed while I learn you. I will never show you an invented number. When it turns solid, it's real."
      footer={<NextBar label="Deal" onPress={goNext} />}
    >
      <GlassCard variant="night">
        <Text style={styles.eyebrow}>Calibrating</Text>
        <OnboardingWaveStrip progress={0.15} color={colors.onNight} style={styles.wave} />
        <View style={styles.captionRow}>
          <Text style={styles.caption}>Day 1</Text>
          <Text style={styles.caption}>Real by day 4</Text>
        </View>
      </GlassCard>

      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel="Why dashed?"
        accessibilityState={{ expanded }}
        style={styles.whyLink}
      >
        <Text style={styles.whyLinkText}>Why dashed?</Text>
      </Pressable>
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
  whyLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  whyLinkText: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    textDecorationLine: 'underline',
  },
  whyExplanation: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
