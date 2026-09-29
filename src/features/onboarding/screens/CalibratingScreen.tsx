import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { WaveChart } from '@/shared/components/WaveChart';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import { dietProfileCompletenessDetail } from '@/features/onboarding/lib/dietProfileCompleteness';
import { flowStepRoute, type FlowStepId } from '@/features/onboarding/lib/steps';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';

/**
 * The wave-progress "calibrating your core" screen — the payoff moment right before signup
 * (onboarding-v2-flow-plan.md §1, row 15). Reads completeness straight from the **local draft**
 * (no `GET`, no session needed yet — v2 §2) so it renders instantly; the draft only becomes a
 * real server profile once "Save your core" commits it in one `PUT` after register.
 */
export default function CalibratingScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);

  const { ratio, nextLabel, nextQuestionId } = dietProfileCompletenessDetail(draft.dietProfile);
  const percent = Math.round(ratio * 100);
  const complete = ratio >= 1;

  const goToSave = () => router.push(flowStepRoute('save'));

  const continueUnfinished = () => {
    if (!nextQuestionId) return;
    router.push(flowStepRoute(nextQuestionId as FlowStepId));
  };

  return (
    <OnboardingStepScaffold
      title={
        <Text style={onboardingTitleStyles.base}>
          Building your <Text style={onboardingTitleStyles.emphasis}>core.</Text>
        </Text>
      }
      subtitle={
        complete
          ? "Everything I need to plan around you is in. Let's save it."
          : "I've got most of it. A couple more answers make the plan sharper."
      }
      footer={
        <NextBar
          label={complete ? 'Save my core' : 'Finish the rest'}
          onPress={complete ? goToSave : continueUnfinished}
        />
      }
    >
      <GlassCard variant="night">
        <Text style={styles.eyebrow}>Calibrating</Text>
        <WaveChart progress={ratio} color={colors.onNight} style={styles.wave} />
        <View style={styles.captionRow}>
          <Text style={styles.caption}>{percent}% calibrated</Text>
          <Text style={styles.caption}>{nextLabel ? `${nextLabel} next` : 'All set'}</Text>
        </View>
      </GlassCard>
      {complete ? (
        <Text style={styles.note}>
          Your plan will keep sharpening the more you log — never guessed.
        </Text>
      ) : (
        <Text style={styles.note}>You can always finish the rest later from your profile.</Text>
      )}
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
  note: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
