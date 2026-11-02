import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { SliderRow } from '@/shared/components/SliderRow';
import { spacing, textStyle, colors } from '@/shared/theme/tokens';
import { GENDERS, type Gender } from '@/shared/types/user';
import { ContinueBar } from '@/features/onboarding/components/ContinueBar';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';
import {
  aboutYouMeasurementsSchema,
  type AboutYouMeasurementsValues,
} from '@/features/onboarding/schemas';

const GENDER_LABEL: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

/**
 * About you — age/height/weight/sex (Claude Design 7a·4), shown only when Diet was selected.
 * Displayed/stored in metric (cm/kg) to match `POST /users/register/`'s `height_cm`/
 * `weight_kg` fields directly, rather than the mockup's imperial display — a deliberate, labeled
 * adaptation to keep the data model clean instead of unit-converting for display only.
 */
export default function AboutYouScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const measurementValidation = aboutYouMeasurementsSchema.safeParse({
    ageYears: draft.ageYears,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
  });
  const measurementErrors: Partial<Record<keyof AboutYouMeasurementsValues, string>> =
    measurementValidation.success
      ? {}
      : measurementValidation.error.issues.reduce<
          Partial<Record<keyof AboutYouMeasurementsValues, string>>
        >((errors, issue) => {
          const field = issue.path[0];
          if (field === 'ageYears' || field === 'heightCm' || field === 'weightKg') {
            errors[field] = issue.message;
          }
          return errors;
        }, {});

  const goNext = () => {
    if (!draft.gender || !measurementValidation.success) return;
    completeStep('about-you');
    const next = nextFlowStep('about-you', draft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('about-you', draft)}
      title={
        <Text style={onboardingTitleStyles.base}>
          The basics, so my <Text style={onboardingTitleStyles.emphasis}>math is right.</Text>
        </Text>
      }
      footer={
        <ContinueBar onPress={goNext} disabled={!draft.gender || !measurementValidation.success} />
      }
    >
      <View style={styles.stack}>
        <SliderRow
          label="Age"
          value={draft.ageYears}
          min={16}
          max={90}
          onChange={(ageYears) => update({ ageYears })}
        />
        {measurementErrors.ageYears ? (
          <Text style={styles.error}>{measurementErrors.ageYears}</Text>
        ) : null}

        <SliderRow
          label="Height"
          value={draft.heightCm}
          min={140}
          max={210}
          unit="cm"
          onChange={(heightCm) => update({ heightCm })}
        />
        {measurementErrors.heightCm ? (
          <Text style={styles.error}>{measurementErrors.heightCm}</Text>
        ) : null}
        <SliderRow
          label="Weight"
          value={draft.weightKg}
          min={40}
          max={160}
          unit="kg"
          onChange={(weightKg) => update({ weightKg })}
        />
        {measurementErrors.weightKg ? (
          <Text style={styles.error}>{measurementErrors.weightKg}</Text>
        ) : null}
        <GlassCard variant="light" padded={false}>
          <View testID="sex-card-content" style={styles.sexCardContent}>
            <Text style={styles.sexLabel}>Sex</Text>
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
          </View>
        </GlassCard>
      </View>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.ms,
  },
  error: {
    ...textStyle('caption'),
    color: colors.attention,
    paddingHorizontal: spacing.sliderCaptionGap,
  },
  sexCardContent: {
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.xl,
  },
  sexLabel: {
    ...textStyle('label'),
    color: colors.label,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
