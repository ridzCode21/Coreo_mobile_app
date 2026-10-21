import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { GlassCard } from '@/shared/components/GlassCard';
import { PetalCluster } from '@/shared/components/PetalCluster';
import { PrimaryIconButton } from '@/shared/components/PrimaryIconButton';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

const ARRIVAL_PETALS = [
  { id: 'wellness', label: 'Wellness' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'diet', label: 'Diet' },
  { id: 'core', label: 'Core', emphasized: true },
] as const;

export default function ArrivalScreen() {
  const router = useRouter();
  const name = useOnboardingStore((state) => state.draft.name);
  const resetOnboarding = useOnboardingStore((state) => state.reset);

  const enterCoreo = () => {
    resetOnboarding();
    router.replace('/(app)');
  };

  return (
    <OnboardingStepScaffold
      progress={{ index: 4, total: 5 }}
      title={
        <View>
          <Text style={onboardingTitleStyles.base}>
            That&apos;s everything, <Text style={onboardingTitleStyles.emphasis}>{name}.</Text>
          </Text>
          <Text style={styles.subtitle}>Your pillars are waiting. Come meet them.</Text>
          <Text style={styles.note}>
            For the first few days your wave stays dashed while I learn you. I will never show you
            an invented number.
          </Text>
        </View>
      }
      footer={
        <GlassCard variant="light" radius={radii.pill} padded={false}>
          <View style={styles.cta}>
            <Text style={styles.ctaLabel}>Enter Coreo</Text>
            <PrimaryIconButton
              accessibilityLabel="Enter Coreo"
              onPress={enterCoreo}
              size={componentSizes.arrivalCtaIconCircle}
              icon={
                <Svg
                  width={componentSizes.onboardingArrowIcon}
                  height={componentSizes.onboardingArrowIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke={colors.white}
                    strokeWidth={componentSizes.onboardingArrowStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              }
            />
          </View>
        </GlassCard>
      }
    >
      <PetalCluster items={[...ARRIVAL_PETALS]} />
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...textStyle('bodyLg'),
    color: colors.ink60,
    marginTop: spacing.md,
  },
  note: {
    ...textStyle('arrivalNote'),
    color: colors.ink50,
    marginTop: spacing.sm,
  },
  cta: {
    alignItems: 'center',
    flexDirection: 'row',
    height: componentSizes.arrivalCtaHeight,
    justifyContent: 'space-between',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  ctaLabel: {
    ...textStyle('buttonSm'),
    color: colors.ink,
  },
});
