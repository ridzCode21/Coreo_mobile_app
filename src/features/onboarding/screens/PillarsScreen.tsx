import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SelectableChip, SelectableChipDisplay } from '@/shared/components/SelectableChip';
import { ToggleRow } from '@/shared/components/ToggleRow';
import { componentSizes, spacing } from '@/shared/theme/tokens';
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
  const update = useOnboardingStore((state) => state.update);
  const togglePillar = useOnboardingStore((state) => state.togglePillar);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const selectAllThree = () => update({ pillars: PILLARS.map((pillar) => pillar.key) });

  const goNext = () => {
    completeStep('pillars');
    const next = nextFlowStep('pillars', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('pillars', draft)}
      title={
        <Text style={onboardingTitleStyles.base}>
          Where do we <Text style={onboardingTitleStyles.emphasis}>start?</Text>
        </Text>
      }
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
            minHeight={componentSizes.pillarRowHeight}
          />
        ))}
      </View>
      <View style={styles.quickPicks}>
        <SelectableChip
          label="All three"
          selected={draft.pillars.length === PILLARS.length}
          onPress={selectAllThree}
        />
        <SelectableChipDisplay label="These two" selected={draft.pillars.length === 2} />
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  quickPicks: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
