import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authErrorMessage, useRequestPasswordResetMutation } from '@/features/auth/api/authApi';
import {
  requestPasswordResetSchema,
  type RequestPasswordResetFormValues,
} from '@/features/auth/schemas';
import { AuthFormScaffold, authTitleStyles } from '@/shared/components/AuthFormScaffold';
import { LabeledField } from '@/shared/components/LabeledField';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const requestMutation = useRequestPasswordResetMutation();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetFormValues>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: '' },
  });

  const requestReset = (values: RequestPasswordResetFormValues) => {
    setBanner(null);
    requestMutation.mutate(values, {
      onSuccess: () => setSentEmail(values.email),
      onError: (error) => {
        setBanner(authErrorMessage(error, 'Unable to send a reset email. Please try again.'));
      },
    });
  };

  if (sentEmail) {
    return (
      <AuthFormScaffold
        title={
          <View style={styles.titleRow}>
            <Text style={authTitleStyles.base}>Check your</Text>
            <Text style={[authTitleStyles.base, authTitleStyles.emphasis]}>inbox.</Text>
          </View>
        }
        description={
          <Text style={styles.description}>
            If that email has a Coreo account, a reset token is on its way. It expires in 1 hour.
          </Text>
        }
        footer={
          <View>
            <Pressable
              onPress={() => router.push('/(auth)/new-password')}
              accessibilityRole="button"
              accessibilityLabel="Enter the token"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Enter the token</Text>
            </Pressable>
            <Pressable
              onPress={() => requestReset({ email: sentEmail })}
              disabled={requestMutation.isPending}
              accessibilityRole="link"
              accessibilityLabel="Send it again"
              accessibilityState={{ disabled: requestMutation.isPending }}
              style={styles.link}
            >
              <Text style={styles.linkText}>Send it again</Text>
            </Pressable>
          </View>
        }
      >
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      </AuthFormScaffold>
    );
  }

  return (
    <AuthFormScaffold
      title={
        <View style={styles.titleRow}>
          <Text style={authTitleStyles.base}>Reset your</Text>
          <Text style={[authTitleStyles.base, authTitleStyles.emphasis]}>password.</Text>
        </View>
      }
      description={
        <Text style={styles.description}>
          Tell us the email on your account. We&apos;ll send a reset token.
        </Text>
      }
      footer={
        <Pressable
          onPress={handleSubmit(requestReset)}
          disabled={requestMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Send reset email"
          accessibilityState={{ disabled: requestMutation.isPending }}
          style={[styles.primaryButton, requestMutation.isPending && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Send reset email</Text>
        </Pressable>
      }
    >
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
      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
    </AuthFormScaffold>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  description: { ...textStyle('bodyLg'), color: colors.ink60 },
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
