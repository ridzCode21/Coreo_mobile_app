import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  registerFieldErrors,
  registerSchema,
  useRegisterMutation,
  useSessionStore,
  type RegisterFormValues,
  type RegisterRequestValues,
} from '@/features/auth';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { WaveChart } from '@/shared/components/WaveChart';
import { GOAL_TYPE_LABEL } from '@/features/onboarding/lib/dietQuestions';
import { resolveGoalType } from '@/features/onboarding/lib/resolveGoalType';
import { useUpdateDietProfileMutation } from '@/features/onboarding/api/dietProfileApi';
import {
  useOnboardingStore,
  type OnboardingDraft,
  type OnboardingPillar,
} from '@/features/onboarding/store/onboardingStore';
import type { DietProfilePatch } from '@/shared/types/dietProfile';

const PILLAR_LABEL: Record<OnboardingPillar, string> = {
  fitness: 'fitness',
  diet: 'diet',
  wellness: 'wellness',
};

function buildSummaryLine(draft: OnboardingDraft): string {
  const bits: string[] = [];
  if (draft.name) bits.push(draft.name);
  if (draft.dietProfile.goal_type)
    bits.push(GOAL_TYPE_LABEL[draft.dietProfile.goal_type].toLowerCase());
  if (draft.pillars.length > 0) {
    bits.push(draft.pillars.map((pillar) => PILLAR_LABEL[pillar]).join(' + '));
  }
  return bits.join(' · ');
}

/**
 * `register` wants a `date_of_birth`; the interview only collects an age slider
 * (onboarding-v2-flow-plan.md D3, default chosen: keep the age slider, convert here). This is a
 * labeled approximation (January 1st of the birth year), not a real date of birth — fine for the
 * mock estimate this feeds, not something to treat as accurate elsewhere.
 */
function ageToApproxDob(ageYears: number): string {
  const birthYear = new Date().getFullYear() - Math.round(ageYears);
  return `${birthYear}-01-01`;
}

/** Assembles the one, whole-draft `PUT /users/me/diet-profile/` payload — v2's single commit
 * point (onboarding-v2-flow-plan.md §2), replacing the old per-question PUT. Includes
 * `weight_kg`/`height_cm` from About You so the mock's Mifflin-St Jeor estimate can actually run
 * (it requires both and previously never received either — see estimateDailyTargets.ts). */
function buildDietProfilePatch(draft: OnboardingDraft): DietProfilePatch {
  return {
    ...draft.dietProfile,
    goal_type: draft.dietProfile.goal_type ?? resolveGoalType(draft.dietProfile.health_conditions),
    weight_kg: draft.weightKg,
    height_cm: draft.heightCm,
    // `meal_frequency` is non-nullable on the wire (the server defaults it to 4) — the draft
    // represents "unanswered" as `null`, so omit the field entirely rather than send `null`.
    meal_frequency: draft.dietProfile.meal_frequency ?? undefined,
  };
}

/**
 * Splits the single onboarding "name" answer (7a·1) into the `first_name`/`last_name` the
 * register contract requires (API_REFERENCE.md §3). The design only ever collects one name
 * field, so this is a labeled assumption, not a contract deviation: a missing surname falls back
 * to "Member" rather than blocking the mocked social buttons on a field the user was never asked.
 */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Friend', lastName: 'Member' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Member' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'friend';
}

/** Generates a unique, clearly-mock identity for the "Continue with Apple/Google" buttons — there
 * is no real OAuth here (F5/implementation-plan.md §3: social sign-in is visual-only, backend is
 * mocked). Each tap gets a fresh email so re-tapping never collides with the mock "email already
 * exists" validation. Carries the same derived `dateOfBirth`/`gender` as the email path so the
 * mock estimate behaves identically regardless of which button created the account. */
function buildMockSocialIdentity(
  provider: 'apple' | 'google',
  draft: OnboardingDraft,
): RegisterRequestValues {
  const { firstName, lastName } = splitName(draft.name);
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName,
    lastName,
    email: `${slugify(draft.name)}.${provider}.${unique}@mock.coreo.app`,
    password: `Mock-${unique}-Aa1`,
    dateOfBirth: ageToApproxDob(draft.ageYears),
    ...(draft.gender ? { gender: draft.gender } : {}),
  };
}

type SocialProvider = 'apple' | 'google';

/**
 * Save your core — the register moment, and v2's single commit point
 * (onboarding-v2-flow-plan.md §2): register, then exactly one `PUT /users/me/diet-profile/` with
 * the whole interview draft, then hand off to `(app)` home. Per implementation-plan.md's F1, this
 * doubles as the only sign-up surface (no separate return-user login screen exists in the design
 * export yet). No progress dots here — screens-source.html shows this step without a dot rail.
 */
export default function SaveScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const signIn = useSessionStore((state) => state.signIn);
  const registerMutation = useRegisterMutation();
  const dietProfileMutation = useUpdateDietProfileMutation();

  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  // Set once register succeeds — lets a failed diet-profile PUT retry without registering again
  // (already signed in at that point). A simplification of the plan's "retry from the persisted
  // draft on next launch" rule (§3): this in-screen retry covers the same failure without needing
  // launch-time detection of a half-committed account, at the cost of not surviving an app kill in
  // that exact multi-second window between register and the PUT succeeding.
  const [registered, setRegistered] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { ...splitName(draft.name), email: '', password: '' },
  });

  const commitDietProfile = () => {
    setBanner(null);
    dietProfileMutation.mutate(buildDietProfilePatch(draft), {
      onSuccess: () => {
        resetOnboarding();
        router.replace('/(app)');
      },
      onError: () => setBanner("Your account is saved, but I couldn't save your plan yet — retry?"),
    });
  };

  const commit = (values: RegisterRequestValues) => {
    setBanner(null);
    registerMutation.mutate(values, {
      onSuccess: async (envelope) => {
        await signIn(envelope.data.tokens);
        setRegistered(true);
        commitDietProfile();
      },
      onError: (error) => {
        setActiveProvider(null);
        const fieldErrors = registerFieldErrors(error);
        if (fieldErrors) {
          let handled = false;
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (field === 'email' || field === 'first_name' || field === 'last_name') {
              const rhfField =
                field === 'email' ? 'email' : field === 'first_name' ? 'firstName' : 'lastName';
              setError(rhfField as keyof RegisterFormValues, { message: messages[0] });
              handled = true;
            }
          }
          if (handled) {
            setShowEmailForm(true);
            return;
          }
        }
        setBanner("Something went wrong saving your core. Let's try again.");
      },
    });
  };

  const handleEmailSubmit = (values: RegisterFormValues) => {
    commit({
      ...values,
      dateOfBirth: ageToApproxDob(draft.ageYears),
      ...(draft.gender ? { gender: draft.gender } : {}),
    });
  };

  const handleSocial = (provider: SocialProvider) => {
    if (activeProvider) return;
    setActiveProvider(provider);
    commit(buildMockSocialIdentity(provider, draft));
  };

  const isBusy = registerMutation.isPending || dietProfileMutation.isPending;

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
              onPress={() => handleSocial('apple')}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              style={[styles.appleButton, isBusy && styles.disabled]}
            >
              <Text style={styles.appleButtonText}>
                {activeProvider === 'apple' ? 'Connecting…' : 'Continue with Apple'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleSocial('google')}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={[styles.googleButton, isBusy && styles.disabled]}
            >
              <Text style={styles.googleButtonText}>
                {activeProvider === 'google' ? 'Connecting…' : 'Continue with Google'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowEmailForm((value) => !value)}
              style={styles.emailLink}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel={
                showEmailForm ? 'Use Apple or Google instead' : 'Use email instead'
              }
            >
              <Text style={styles.emailLinkText}>
                {showEmailForm ? 'Use Apple or Google instead' : 'Use email instead'}
              </Text>
            </Pressable>
          </View>

          {showEmailForm ? (
            <GlassCard variant="light" style={styles.emailCard}>
              <View style={styles.nameRow}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <TextInput
                      placeholder="First name"
                      value={field.value}
                      onChangeText={field.onChange}
                      style={[styles.input, styles.nameInput]}
                      placeholderTextColor={colors.ink40}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <TextInput
                      placeholder="Last name"
                      value={field.value}
                      onChangeText={field.onChange}
                      style={[styles.input, styles.nameInput]}
                      placeholderTextColor={colors.ink40}
                    />
                  )}
                />
              </View>
              {errors.firstName ? (
                <Text style={styles.error}>{errors.firstName.message}</Text>
              ) : null}
              {errors.lastName ? <Text style={styles.error}>{errors.lastName.message}</Text> : null}

              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <TextInput
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={field.value}
                    onChangeText={field.onChange}
                    style={styles.input}
                    placeholderTextColor={colors.ink40}
                  />
                )}
              />
              {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    placeholder="Password"
                    secureTextEntry
                    value={field.value}
                    onChangeText={field.onChange}
                    style={styles.input}
                    placeholderTextColor={colors.ink40}
                  />
                )}
              />
              {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

              <Pressable
                onPress={handleSubmit(handleEmailSubmit)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Create account"
                style={[styles.createButton, isBusy && styles.disabled]}
              >
                <Text style={styles.createButtonText}>
                  {isBusy ? 'Creating account…' : 'Create account'}
                </Text>
              </Pressable>
            </GlassCard>
          ) : null}

          {banner ? (
            <View style={styles.bannerBlock}>
              <Text style={styles.banner}>{banner}</Text>
              {registered ? (
                <Pressable
                  onPress={commitDietProfile}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Retry saving your plan"
                >
                  <Text style={styles.retryText}>{isBusy ? 'Retrying…' : 'Retry'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.almostThere}>
            <Text style={styles.almostThereLabel}>Almost there</Text>
            <WaveChart progress={0.85} height={40} color={colors.ink} />
          </View>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyText}>
              Your data stays yours. Read it, export it, delete it, anytime.
            </Text>
          </View>
        </View>
      }
    >
      <GlassCard variant="light">
        <Text style={styles.summaryText}>{buildSummaryLine(draft)}</Text>
      </GlassCard>
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  summaryText: {
    ...textStyle('bodySm'),
    color: 'rgba(23,25,29,0.75)',
  },
  buttonStack: {
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.6,
  },
  appleButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(18,42,70,0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 26,
  },
  appleButtonText: {
    fontFamily: fontFamily.poppins500,
    fontSize: 14,
    color: colors.ink,
  },
  googleButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: fontFamily.poppins400,
    fontSize: 14,
    color: colors.ink60,
  },
  emailLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  emailLinkText: {
    ...textStyle('bodySm'),
    color: colors.ink60,
    textDecorationLine: 'underline',
  },
  emailCard: {
    marginTop: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  input: {
    ...textStyle('body'),
    color: colors.ink,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  error: {
    ...textStyle('caption'),
    color: colors.attention,
    marginBottom: spacing.sm,
  },
  createButton: {
    backgroundColor: colors.coreBlue,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  createButtonText: {
    ...textStyle('body'),
    color: colors.white,
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
  retryText: {
    ...textStyle('bodySm'),
    color: colors.coreBlue,
    textDecorationLine: 'underline',
  },
  almostThere: {
    marginTop: spacing.lg,
  },
  almostThereLabel: {
    ...textStyle('micro'),
    color: colors.ink40,
    paddingBottom: spacing.xs,
  },
  privacyCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(23,25,29,0.08)',
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  privacyText: {
    ...textStyle('bodySm'),
    fontSize: 10.5,
    color: 'rgba(23,25,29,0.65)',
  },
});
