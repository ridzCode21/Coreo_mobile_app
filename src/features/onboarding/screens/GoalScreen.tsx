import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { spacing } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { INTERVIEW_GOAL_LABEL } from '@/features/onboarding/lib/interviewGoalLabels';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { INTERVIEW_GOALS, type InterviewGoal } from '@/shared/types/user';

export default function GoalScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const selected = draft.goal;
  const progress = flowStepProgress('goal', draft);

  const selectGoal = (goal: InterviewGoal) => {
    // Route from the selected goal, not the render's stale draft before the store update lands.
    const nextDraft = { ...draft, goal };
    update({ goal });
    completeStep('goal');
    const next = nextFlowStep('goal', nextDraft);
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
      subtitle="I'll get you there."
      footer={null}
    >
      <View testID="goal-chips-row" style={styles.chips}>
        {INTERVIEW_GOALS.map((goal) => (
          <SelectableChip
            key={goal}
            label={INTERVIEW_GOAL_LABEL[goal]}
            selected={selected === goal}
            onPress={() => selectGoal(goal)}
          />
        ))}
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
