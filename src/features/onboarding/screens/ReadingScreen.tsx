import { StyleSheet, Text, View } from 'react-native';
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

/** 7a·6 Reading — only reached when at least one source was connected at 7a·5 (see
 * `getNextOnboardingStep`'s skip branch). Purely decorative confirmation, no data captured. */
export default function ReadingScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('reading', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="reading"
      title={
        <Text style={onboardingTitleStyles.base}>
          Thank you. <Text style={onboardingTitleStyles.emphasis}>We&rsquo;re connected.</Text>
        </Text>
      }
      subtitle="Sleep and steps are flowing in. Finish up and we'll go deeper together."
      footer={<NextBar label="Keep going" onPress={goNext} />}
    >
      <GlassCard variant="light">
        <OnboardingWaveStrip progress={0.58} color={colors.ink} />
        <View style={styles.captionRow}>
          <Text style={styles.caption}>58% synced</Text>
          <Text style={styles.caption}>Sleep next</Text>
        </View>
      </GlassCard>
      <Text style={styles.note}>Your data syncs quietly in the background.</Text>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  caption: {
    ...textStyle('label'),
    color: colors.label,
  },
  note: {
    ...textStyle('bodySm'),
    color: 'rgba(23,25,29,0.55)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
