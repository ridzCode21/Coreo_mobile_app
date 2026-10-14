import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  accountCredentialsSchema,
  authErrorMessage,
  registerFieldErrors,
  useLoginMutation,
  useRegisterMutation,
  useSessionStore,
  type AccountCredentialsFormValues,
  type RegisterRequestValues,
} from '@/features/auth';
import {
  interviewFieldsFromDraft,
  isExistingEmailError,
  registerFormField,
  splitName,
} from '@/features/onboarding/lib/registerFromInterview';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { AuthFormScaffold, authTitleStyles } from '@/shared/components/AuthFormScaffold';
import { LabeledField } from '@/shared/components/LabeledField';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

const PASSWORD_HINT =
  'At least 8 characters. Not just numbers, not too common, and not too similar to your email or name.';

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
  } = useForm<AccountCredentialsFormValues>({
    resolver: zodResolver(accountCredentialsSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
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

  const submit = (values: AccountCredentialsFormValues) => {
    commit({
      ...splitName(draft.name),
      ...values,
      ...interviewFieldsFromDraft(draft),
    });
  };
  const isBusy = registerMutation.isPending || loginMutation.isPending;

  return (
    <AuthFormScaffold
      title={
        <View style={styles.titleRow}>
          <Text style={authTitleStyles.base}>Create your</Text>
          <Text style={[authTitleStyles.base, authTitleStyles.emphasis]}>account.</Text>
        </View>
      }
      footer={
        <View>
          <Pressable
            onPress={handleSubmit(submit)}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: isBusy }}
            style={[styles.primaryButton, isBusy && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {isBusy ? 'Creating account…' : 'Create account'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="link"
            accessibilityLabel="I already have an account"
            style={styles.link}
          >
            <Text style={styles.linkText}>I already have an account</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.fields}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <LabeledField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <LabeledField
              label="Password"
              placeholder="Password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}
        <Text style={styles.hint}>{PASSWORD_HINT}</Text>
        <Controller
          control={control}
          name="passwordConfirm"
          render={({ field }) => (
            <LabeledField
              label="Confirm password"
              placeholder="Confirm password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {errors.passwordConfirm ? (
          <Text style={styles.error}>{errors.passwordConfirm.message}</Text>
        ) : null}
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      </View>
    </AuthFormScaffold>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { gap: spacing.ms },
  hint: {
    ...textStyle('legal'),
    color: colors.ink50,
    paddingHorizontal: spacing.sliderCaptionGap,
  },
  error: {
    ...textStyle('caption'),
    color: colors.attention,
    paddingHorizontal: spacing.sliderCaptionGap,
  },
  banner: { ...textStyle('caption'), color: colors.attention, textAlign: 'center' },
  primaryButton: {
    height: componentSizes.authButtonHeight,
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...textStyle('button'), color: colors.white },
  disabled: { opacity: 0.6 },
  link: {
    minHeight: componentSizes.minimumTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...textStyle('linkMd'),
    color: colors.ink55,
    textDecorationLine: 'underline',
  },
});
