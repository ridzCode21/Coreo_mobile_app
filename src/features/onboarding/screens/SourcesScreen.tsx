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
  type OnboardingSource,
} from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

const SOURCES: { key: OnboardingSource; title: string }[] = [
  { key: 'apple_health', title: 'Apple Health' },
  { key: 'apple_watch', title: 'Apple Watch' },
  { key: 'whoop', title: 'Whoop' },
  { key: 'oura', title: 'Oura Ring' },
];

/**
 * 7a·5 Sources — wearable/HealthKit "connect" toggles. Visual only per the F5 flag
 * (implementation-plan.md §1): no real HealthKit/permission prompts, no real OAuth to Whoop/Oura.
 * Toggling just flips local draft state; skippable ("I'll log by hand" → zero sources selected).
 */
export default function SourcesScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const toggleSource = useOnboardingStore((state) => state.toggleSource);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('sources', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="sources"
      title={
        <Text style={onboardingTitleStyles.base}>
          What do you <Text style={onboardingTitleStyles.emphasis}>track with?</Text>
        </Text>
      }
      subtitle="Point me at it and I'll do the reading."
      footer={
        <NextBar
          label={draft.sources.length > 0 ? 'Connect these' : "I'll log by hand"}
          onPress={goNext}
        />
      }
    >
      <View style={styles.stack}>
        {SOURCES.map((source) => (
          <ToggleRow
            key={source.key}
            title={source.title}
            selected={draft.sources.includes(source.key)}
            onPress={() => toggleSource(source.key)}
            minHeight={56}
          />
        ))}
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
});
