import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { NextBar } from '@/features/onboarding/components/NextBar';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';
import { GENDERS, type Gender } from '@/shared/types/user';
import { spacing } from '@/shared/theme/tokens';

const GENDER_LABEL: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

/**
 * Gender — its own screen, split out of `about-you` (onboarding-v2-flow-plan.md §1 row 4).
 * Feeds the Mifflin-St Jeor target estimate the same way age/height/weight do; no design-source
 * mockup, so built in the established diet-interview chip-grid style (like the D3/D5/D8/D9
 * net-new screens) rather than cramming a fourth input onto `about-you`.
 */
export default function GenderScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const goNext = () => {
    completeStep('gender');
    const next = nextFlowStep('gender', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('gender', draft)}
      title={
        <Text style={onboardingTitleStyles.base}>
          And how do you <Text style={onboardingTitleStyles.emphasis}>identify?</Text>
        </Text>
      }
      subtitle="Helps me get your numbers right."
      footer={<NextBar label="Next" onPress={goNext} disabled={!draft.gender} />}
    >
      <View style={styles.chipGrid}>
        {GENDERS.map((gender) => (
          <SelectableChip
            key={gender}
            label={GENDER_LABEL[gender]}
            selected={draft.gender === gender}
            onPress={() => update({ gender })}
          />
        ))}
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
