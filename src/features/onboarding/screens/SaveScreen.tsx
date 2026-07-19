import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  registerFieldErrors,
  registerSchema,
  useRegisterMutation,
  useSessionStore,
  type RegisterFormValues,
} from '@/features/auth';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { OnboardingWaveStrip } from '@/features/onboarding/components/OnboardingWaveStrip';
import {
  useOnboardingStore,
  type OnboardingDraft,
  type OnboardingPillar,
  type OnboardingSource,
} from '@/features/onboarding/store/onboardingStore';

const PILLAR_LABEL: Record<OnboardingPillar, string> = {
  fitness: 'fitness',
  diet: 'diet',
  wellness: 'wellness',
};

const SOURCE_LABEL: Record<OnboardingSource, string> = {
  apple_health: 'Apple Health',
  apple_watch: 'Apple Watch',
  whoop: 'Whoop',
  oura: 'Oura',
};

function buildSummaryLine(draft: OnboardingDraft): string {
  const bits: string[] = [];
  if (draft.name) bits.push(draft.name);
  if (draft.goals.length > 0) bits.push(draft.goals[0].toLowerCase());
  if (draft.pillars.length > 0) {
    bits.push(draft.pillars.map((pillar) => PILLAR_LABEL[pillar]).join(' + '));
  }
  bits.push(
    draft.sources.length > 0
      ? `${draft.sources.map((source) => SOURCE_LABEL[source]).join(' + ')} connected`
      : 'logging by hand',
  );
  return bits.join(' · ');
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
 * exists" validation. */
function buildMockSocialIdentity(
  provider: 'apple' | 'google',
  draft: OnboardingDraft,
): RegisterFormValues {
  const { firstName, lastName } = splitName(draft.name);
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName,
    lastName,
    email: `${slugify(draft.name)}.${provider}.${unique}@mock.coreo.app`,
    password: `Mock-${unique}-Aa1`,
  };
}

type SocialProvider = 'apple' | 'google';

/**
 * 8a Save your core — the register moment. Per implementation-plan.md's F1, this doubles as the
 * only sign-up surface (no separate return-user login screen exists in the design export yet).
 * No progress dots here — screens-source.html shows 8a without the dot rail, so `steps.ts`
 * deliberately excludes `save` from `onboardingProgressIndex`.
 */
export default function SaveScreen() {
  const draft = useOnboardingStore((state) => state.draft);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const signIn = useSessionStore((state) => state.signIn);
  const registerMutation = useRegisterMutation();

  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { ...splitName(draft.name), email: '', password: '' },
  });

  const commit = (values: RegisterFormValues) => {
    setBanner(null);
    registerMutation.mutate(values, {
      onSuccess: (envelope) => {
        resetOnboarding();
        signIn(envelope.data.tokens);
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

  const handleSocial = (provider: SocialProvider) => {
    if (activeProvider) return;
    setActiveProvider(provider);
    commit(buildMockSocialIdentity(provider, draft));
  };

  const isBusy = registerMutation.isPending;

  return (
    <OnboardingStepScaffold
      step="save"
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
                onPress={handleSubmit(commit)}
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

          {banner ? <Text style={styles.banner}>{banner}</Text> : null}

          <View style={styles.almostThere}>
            <Text style={styles.almostThereLabel}>Almost there</Text>
            <OnboardingWaveStrip progress={0.85} height={40} color={colors.ink} />
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
    marginTop: spacing.sm,
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
    borderRadius: radii.md,
    padding: spacing.md,
  },
  privacyText: {
    ...textStyle('bodySm'),
    fontSize: 10.5,
    color: 'rgba(23,25,29,0.65)',
  },
});
