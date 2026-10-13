import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { NextBar } from '@/features/onboarding/components/NextBar';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { INTERVIEW_GOAL_LABEL } from '@/features/onboarding/lib/interviewGoalLabels';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { INTERVIEW_GOALS } from '@/shared/types/user';

export default function GoalScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const selected = draft.goal;
  const progress = flowStepProgress('goal', draft);

  const goNext = () => {
    completeStep('goal');
    const next = nextFlowStep('goal', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={progress}
      title={
        <Text style={onboardingTitleStyles.base}>
          {draft.name || 'Alright'}, tell me{' '}
          <Text style={onboardingTitleStyles.emphasis}>what you want to fix.</Text>
        </Text>
      }
      subtitle="I will tune the rest around this."
      footer={<NextBar label="Next" onPress={goNext} disabled={!selected} />}
    >
      <View style={styles.chips}>
        {INTERVIEW_GOALS.map((goal) => (
          <SelectableChip
            key={goal}
            label={INTERVIEW_GOAL_LABEL[goal]}
            selected={selected === goal}
            onPress={() => update({ goal })}
          />
        ))}
      </View>
      <Text style={styles.note}>You can sharpen this later from Diet.</Text>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  note: {
    ...textStyle('bodySm'),
    color: colors.ink45,
    marginTop: spacing.lg,
  },
});
