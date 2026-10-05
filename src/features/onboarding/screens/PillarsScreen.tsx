import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ToggleRow } from '@/shared/components/ToggleRow';
import { spacing } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import {
  useOnboardingStore,
  type OnboardingPillar,
} from '@/features/onboarding/store/onboardingStore';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';

const PILLARS: { key: OnboardingPillar; title: string }[] = [
  { key: 'fitness', title: 'Fitness' },
  { key: 'diet', title: 'Diet' },
  { key: 'wellness', title: 'Wellness' },
];

/**
 * Pillars — a non-gating focus screen (onboarding-v2-flow-plan.md D2/§4): only the nutrition
 * interview has an API home today (F2, feature-map.md — fitness/wellness interviews aren't built
 * yet), so *everyone* runs it regardless of what's picked here. This screen exists purely to let
 * the user say what they care about most for personalization/copy later, not to branch the
 * interview — a deliberate simplification from the old flow, where picking "Diet" used to be the
 * only way to reach the nutrition questions at all.
 */
export default function PillarsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const togglePillar = useOnboardingStore((state) => state.togglePillar);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const goNext = () => {
    completeStep('pillars');
    const next = nextFlowStep('pillars', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('pillars', draft)}
      title={<Text style={onboardingTitleStyles.base}>Where do we start?</Text>}
      subtitle="Pick one pillar, two, or take all three. I'll always start with your nutrition core, whatever you choose."
      footer={<NextBar label="Next" onPress={goNext} disabled={draft.pillars.length === 0} />}
    >
      <View style={styles.stack}>
        {PILLARS.map((pillar) => (
          <ToggleRow
            key={pillar.key}
            title={pillar.title}
            selected={draft.pillars.includes(pillar.key)}
            onPress={() => togglePillar(pillar.key)}
          />
        ))}
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
