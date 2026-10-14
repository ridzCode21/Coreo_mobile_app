import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authErrorMessage, useLoginMutation } from '@/features/auth/api/authApi';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { AuthFormScaffold, authTitleStyles } from '@/shared/components/AuthFormScaffold';
import { LabeledField } from '@/shared/components/LabeledField';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useSessionStore((state) => state.signIn);
  const loginMutation = useLoginMutation();
  const [banner, setBanner] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = (values: LoginFormValues) => {
    setBanner(null);
    loginMutation.mutate(values, {
      onSuccess: async (envelope) => {
        await signIn(envelope.data.tokens);
        router.replace('/(app)');
      },
      onError: (error) => {
        setBanner(authErrorMessage(error, 'Unable to sign in. Please try again.'));
      },
    });
  };

  return (
    <AuthFormScaffold
      title={
        <View style={styles.titleRow}>
          <Text style={authTitleStyles.base}>Sign in</Text>
          <Text style={[authTitleStyles.base, authTitleStyles.emphasis]}>with email.</Text>
        </View>
      }
      footer={
        <View>
          <Pressable
            onPress={handleSubmit(submit)}
            disabled={loginMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loginMutation.isPending }}
            style={[styles.primaryButton, loginMutation.isPending && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="link"
            accessibilityLabel="Forgot your password?"
            style={styles.link}
          >
            <Text style={styles.linkText}>Forgot your password?</Text>
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
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      </View>
    </AuthFormScaffold>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { gap: spacing.ms },
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
