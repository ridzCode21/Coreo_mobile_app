import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { Screen } from '@/shared/components/Screen';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';
import {
  loginSchema,
  useLoginMutation,
  useSessionStore,
  type LoginFormValues,
} from '@/features/auth';

/**
 * Placeholder screen proving the auth wiring end-to-end (form validation, mutation, session
 * store, redirect). The actual visual design for this screen — see the onboarding/voice-input
 * flows in docs/design-system.md — is a follow-up feature task, not part of app scaffolding.
 */
export default function LoginScreen() {
  const signIn = useSessionStore((state) => state.signIn);
  const loginMutation = useLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onSuccess: (data) => signIn(data.token),
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>Coreo</Text>
      <GlassCard>
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
          onPress={handleSubmit(onSubmit)}
          disabled={loginMutation.isPending}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    color: colors.ink,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  input: {
    fontSize: typography.body.fontSize,
    color: colors.ink,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  error: {
    fontSize: typography.caption.fontSize,
    color: colors.attention,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.coreBlue,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body.fontSize,
    fontWeight: typography.label.fontWeight,
  },
});
