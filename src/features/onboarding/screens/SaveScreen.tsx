import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  authErrorMessage,
  registerFieldErrors,
  useLoginMutation,
  usePillarSelectionStore,
  useRegisterMutation,
  useSessionStore,
  type RegisterRequestValues,
} from '@/features/auth';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { INTERVIEW_GOAL_LABEL } from '@/features/onboarding/lib/interviewGoalLabels';
import {
  buildMockSocialIdentity,
  isExistingEmailError,
} from '@/features/onboarding/lib/registerFromInterview';
import {
  useOnboardingStore,
  type OnboardingDraft,
  type OnboardingPillar,
} from '@/features/onboarding/store/onboardingStore';
import { GlassCard } from '@/shared/components/GlassCard';
import { WaveChart } from '@/shared/components/WaveChart';
import {
  colors,
  componentSizes,
  fontFamily,
  radii,
  spacing,
  textStyle,
  typography,
  withAlpha,
} from '@/shared/theme/tokens';

const PILLAR_LABEL: Record<OnboardingPillar, string> = {
  fitness: 'Fitness',
  diet: 'Diet',
  wellness: 'Wellness',
};

function buildSummaryLine(draft: OnboardingDraft): string {
  const bits: string[] = [];
  if (draft.name) bits.push(draft.name);
  if (draft.goal) bits.push(INTERVIEW_GOAL_LABEL[draft.goal]);
  if (draft.pillars.length > 0) {
    bits.push(draft.pillars.map((pillar) => PILLAR_LABEL[pillar]).join(' + '));
  }
  return bits.join(' · ');
}

export default function SaveScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const signIn = useSessionStore((state) => state.signIn);
  const setActivePillars = usePillarSelectionStore((state) => state.setActivePillars);
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const finishSignIn = async (tokens: { access: string; refresh: string }) => {
    await signIn(tokens);
    setActivePillars(draft.pillars);
    resetOnboarding();
    router.replace('/(app)');
  };

  const commit = (values: RegisterRequestValues) => {
    setBanner(null);
    registerMutation.mutate(values, {
      onSuccess: (envelope) => finishSignIn(envelope.data.tokens),
      onError: (error) => {
        setIsConnecting(false);
        const fieldErrors = registerFieldErrors(error);
        if (isExistingEmailError(fieldErrors)) {
          loginMutation.mutate(
            { email: values.email, password: values.password },
            {
              onSuccess: (envelope) => finishSignIn(envelope.data.tokens),
              onError: () => {
                setBanner(
                  'That Google email already has an account. Use email instead to sign in.',
                );
              },
            },
          );
          return;
        }
        setBanner(
          authErrorMessage(error, "Something went wrong saving your core. Let's try again."),
        );
      },
    });
  };

  const handleGoogle = () => {
    if (isConnecting) return;
    setIsConnecting(true);
    commit(buildMockSocialIdentity('google', draft));
  };

  const isBusy = isConnecting || registerMutation.isPending || loginMutation.isPending;

  return (
    <OnboardingStepScaffold
      title={
        <Text style={onboardingTitleStyles.base}>
          Save me, <Text style={onboardingTitleStyles.emphasis}>so I don&rsquo;t forget you.</Text>
        </Text>
      }
      subtitle="Everything I just learned lives with your account."
      footer={
        <View>
          <View style={styles.buttonStack}>
            <Pressable
              onPress={handleGoogle}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={[styles.googleButton, isBusy && styles.disabled]}
            >
              <Text testID="save-google-label" style={styles.googleButtonText}>
                {isConnecting ? 'Connecting…' : 'Continue with Google'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(public)/onboarding/create-account')}
              style={styles.emailLink}
              disabled={isBusy}
              accessibilityRole="link"
              accessibilityLabel="Use email instead"
            >
              <Text testID="save-email-link-text" style={styles.emailLinkText}>
                Use email instead
              </Text>
            </Pressable>
          </View>

          {banner ? (
            <View style={styles.bannerBlock}>
              <Text style={styles.banner}>{banner}</Text>
            </View>
          ) : null}

          <View style={styles.almostThere}>
            <Text style={styles.almostThereLabel}>Almost there</Text>
            <WaveChart progress={0.85} height={40} color={colors.ink} />
          </View>

          <View testID="save-privacy-card" style={styles.privacyCard}>
            <Text style={styles.privacyText}>
              Your data stays yours. Read it, export it, delete it, anytime.
            </Text>
          </View>
        </View>
      }
    >
      <GlassCard variant="light">
        <View testID="save-summary-card" style={styles.summaryRow}>
          <Svg
            width={componentSizes.saveSummaryIcon}
            height={componentSizes.saveSummaryIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M4 9c2.5-2 5.5-2 8 0s5.5 2 8 0"
              stroke={colors.ink70}
              strokeWidth={componentSizes.saveSummaryIconStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M4 15c2.5-2 5.5-2 8 0s5.5 2 8 0"
              stroke={colors.ink70}
              strokeWidth={componentSizes.saveSummaryIconStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.summaryText}>{buildSummaryLine(draft)}</Text>
        </View>
      </GlassCard>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
  },
  summaryText: {
    ...textStyle('bodySm'),
    color: colors.ink75,
    flexShrink: 1,
  },
  buttonStack: { gap: spacing.sm },
  disabled: { opacity: 0.6 },
  googleButton: {
    height: componentSizes.saveSocialButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.3),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: fontFamily.poppins400,
    fontSize: typography.button.fontSize,
    color: colors.ink80,
  },
  emailLink: {
    alignSelf: 'center',
    minHeight: componentSizes.minimumTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emailLinkText: {
    ...textStyle('linkMd'),
    color: colors.ink55,
    textDecorationLine: 'underline',
  },
  banner: {
    ...textStyle('caption'),
    color: colors.attention,
    textAlign: 'center',
  },
  bannerBlock: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  almostThere: { marginTop: spacing.lg },
  almostThereLabel: {
    ...textStyle('micro'),
    color: colors.ink40,
    paddingBottom: spacing.xs,
  },
  privacyCard: {
    marginTop: spacing.md,
    backgroundColor: withAlpha(colors.ink, 0.08),
    borderRadius: radii.legal,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.ml,
  },
  privacyText: {
    ...textStyle('legal'),
    color: withAlpha(colors.ink, 0.65),
  },
});
