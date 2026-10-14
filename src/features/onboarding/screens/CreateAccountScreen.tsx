import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  authErrorMessage,
  registerFieldErrors,
  registerSchema,
  useLoginMutation,
  useRegisterMutation,
  useSessionStore,
  type RegisterFormValues,
  type RegisterRequestValues,
} from '@/features/auth';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import {
  interviewFieldsFromDraft,
  isExistingEmailError,
  registerFormField,
  splitName,
} from '@/features/onboarding/lib/registerFromInterview';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

export default function CreateAccountScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const signIn = useSessionStore((state) => state.signIn);
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
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

  const finishSignIn = async (tokens: { access: string; refresh: string }) => {
    await signIn(tokens);
    resetOnboarding();
    router.replace('/(app)');
  };

  const commit = (values: RegisterRequestValues) => {
    setBanner(null);
    registerMutation.mutate(values, {
      onSuccess: (envelope) => finishSignIn(envelope.data.tokens),
      onError: (error) => {
        const fieldErrors = registerFieldErrors(error);
        if (isExistingEmailError(fieldErrors)) {
          loginMutation.mutate(
            { email: values.email, password: values.password },
            {
              onSuccess: (envelope) => finishSignIn(envelope.data.tokens),
              onError: () => {
                setError('password', {
                  message: 'That email already exists. Use its password, or choose another email.',
                });
              },
            },
          );
          return;
        }

        if (fieldErrors) {
          let handled = false;
          for (const [field, messages] of Object.entries(fieldErrors)) {
            const formField = registerFormField(field);
            if (!formField) continue;
            setError(formField, { message: messages[0] });
            handled = true;
          }
          if (handled) return;
        }

        setBanner(
          authErrorMessage(error, "Something went wrong saving your core. Let's try again."),
        );
      },
    });
  };

  const submit = (values: RegisterFormValues) => {
    commit({ ...values, ...interviewFieldsFromDraft(draft) });
  };

  const isBusy = registerMutation.isPending || loginMutation.isPending;

  return (
    <OnboardingStepScaffold
      title={<Text style={onboardingTitleStyles.base}>Create your account</Text>}
      footer={null}
    >
      <GlassCard variant="light">
        <View style={styles.nameRow}>
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <TextInput
                accessibilityLabel="First name"
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
                accessibilityLabel="Last name"
                placeholder="Last name"
                value={field.value}
                onChangeText={field.onChange}
                style={[styles.input, styles.nameInput]}
                placeholderTextColor={colors.ink40}
              />
            )}
          />
        </View>
        {errors.firstName ? <Text style={styles.error}>{errors.firstName.message}</Text> : null}
        {errors.lastName ? <Text style={styles.error}>{errors.lastName.message}</Text> : null}

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextInput
              accessibilityLabel="Email"
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
              accessibilityLabel="Password"
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
          onPress={handleSubmit(submit)}
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

      {banner ? (
        <View style={styles.bannerBlock}>
          <Text style={styles.banner}>{banner}</Text>
        </View>
      ) : null}
    </OnboardingStepScaffold>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameInput: { flex: 1 },
  input: {
    ...textStyle('body'),
    color: colors.ink,
    minHeight: componentSizes.minimumTapTarget,
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
    minHeight: componentSizes.minimumTapTarget,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  createButtonText: { ...textStyle('body'), color: colors.white },
  disabled: { opacity: 0.6 },
  banner: {
    ...textStyle('caption'),
    color: colors.attention,
    textAlign: 'center',
  },
  bannerBlock: { marginTop: spacing.sm, alignItems: 'center' },
});
