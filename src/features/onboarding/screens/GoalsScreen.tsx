import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { spacing } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

const GOAL_OPTIONS = [
  'Get stronger',
  'Sleep better',
  'Less stress',
  'Lose weight',
  'More energy',
  'Eat cleaner',
];

/** 7a·2 Goals — multi-select; at least one goal is required to continue (a reasonable,
 * clearly-labeled assumption — the design doesn't state a minimum explicitly). */
export default function GoalsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const toggleGoal = useOnboardingStore((state) => state.toggleGoal);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('goals', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="goals"
      title={
        <Text style={onboardingTitleStyles.base}>
          {draft.name || 'Alright'}, tell me what you{' '}
          <Text style={onboardingTitleStyles.emphasis}>want to fix.</Text>
        </Text>
      }
      subtitle="I'll get you there."
      footer={<NextBar label="Next" onPress={goNext} disabled={draft.goals.length === 0} />}
    >
      <View style={styles.grid}>
        {GOAL_OPTIONS.map((goal) => (
          <SelectableChip
            key={goal}
            label={goal}
            selected={draft.goals.includes(goal)}
            onPress={() => toggleGoal(goal)}
          />
        ))}
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
