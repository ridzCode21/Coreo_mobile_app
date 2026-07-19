import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ToggleRow } from '@/shared/components/ToggleRow';
import { radii, spacing } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import {
  useOnboardingStore,
  type OnboardingPillar,
} from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

const PILLARS: { key: OnboardingPillar; title: string }[] = [
  { key: 'fitness', title: 'Fitness' },
  { key: 'diet', title: 'Diet' },
  { key: 'wellness', title: 'Wellness' },
];

/** 7a·4 Pillars — pick one, two, or all three. Later phases (12a/16a/17a) will run only the
 * interview for whichever pillars are selected here — see `features/onboarding/lib/steps.ts`. */
export default function PillarsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const togglePillar = useOnboardingStore((state) => state.togglePillar);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('pillars', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="pillars"
      title={<Text style={onboardingTitleStyles.base}>Where do we start?</Text>}
      subtitle="Pick one pillar, two, or take all three. I'll ask the right questions once you choose."
      footer={<NextBar label="Next" onPress={goNext} disabled={draft.pillars.length === 0} />}
    >
      <View style={styles.stack}>
        {PILLARS.map((pillar) => (
          <ToggleRow
            key={pillar.key}
            title={pillar.title}
            selected={draft.pillars.includes(pillar.key)}
            onPress={() => togglePillar(pillar.key)}
            radius={radii.xl}
            minHeight={76}
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
