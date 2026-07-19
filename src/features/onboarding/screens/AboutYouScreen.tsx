import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SliderRow } from '@/shared/components/SliderRow';
import { spacing } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

/**
 * 7a·3 About you — age/height/weight sliders. Displayed and stored in metric (cm/kg) to match
 * `PUT /users/me/diet-profile/`'s `height_cm`/`weight_kg` fields directly (API_REFERENCE.md §5),
 * rather than the mockup's imperial display (5'11", 172 lb) — a deliberate, labeled adaptation to
 * keep the data model clean instead of doing unit-conversion just for display.
 */
export default function AboutYouScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);

  const goNext = () => {
    router.push(onboardingStepRoute(getNextOnboardingStep('about-you', draft)));
  };

  return (
    <OnboardingStepScaffold
      step="about-you"
      title={
        <Text style={onboardingTitleStyles.base}>
          The basics, so my <Text style={onboardingTitleStyles.emphasis}>math is right.</Text>
        </Text>
      }
      subtitle="Slide, or just tell me."
      footer={<NextBar label="Next" onPress={goNext} />}
    >
      <View style={styles.stack}>
        <SliderRow
          label="Age"
          value={draft.ageYears}
          min={16}
          max={90}
          onChange={(ageYears) => update({ ageYears })}
        />
        <SliderRow
          label="Height"
          value={draft.heightCm}
          min={140}
          max={210}
          unit="cm"
          onChange={(heightCm) => update({ heightCm })}
        />
        <SliderRow
          label="Weight"
          value={draft.weightKg}
          min={40}
          max={160}
          unit="kg"
          onChange={(weightKg) => update({ weightKg })}
        />
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
