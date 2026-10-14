import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { PASSWORD_HINT } from '@/features/auth/constants';
import {
  authErrorMessage,
  isInvalidTokenError,
  passwordResetFieldErrors,
  useConfirmPasswordResetMutation,
} from '@/features/auth/api/authApi';
import { newPasswordSchema, type NewPasswordFormValues } from '@/features/auth/schemas';
import { AuthFormScaffold, authTitleStyles } from '@/shared/components/AuthFormScaffold';
import { LabeledField } from '@/shared/components/LabeledField';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

const INVALID_TOKEN_MESSAGE =
  "That token didn't work. It may have expired or already been used — request a new one.";

function SuccessState() {
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  return (
    <SkyBackground style={styles.fill}>
      <SafeAreaView style={styles.successSafeArea}>
        <View style={[styles.successContent, { maxWidth: contentMaxWidth }]}>
          <View style={styles.successIcon} accessible={false}>
            <Svg
              width={componentSizes.passwordResetCheckIcon}
              height={componentSizes.passwordResetCheckIcon}
              viewBox="0 0 24 24"
            >
              <Path
                d="M20 6L9 17l-5-5"
                fill="none"
                stroke={colors.white}
                strokeWidth={componentSizes.passwordResetCheckStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.successTitle}>Password reset</Text>
          <Text style={styles.successBody}>Sign in with your new password.</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={styles.successButton}
          >
            <Text style={styles.successButtonText}>Sign in</Text>
          </Pressable>
          <Text style={styles.successCaption}>You are not signed in automatically.</Text>
        </View>
      </SafeAreaView>
    </SkyBackground>
  );
}

export default function NewPasswordScreen() {
  const router = useRouter();
  const confirmMutation = useConfirmPasswordResetMutation();
  const [banner, setBanner] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { token: '', newPassword: '', newPasswordConfirm: '' },
  });

  const submit = (values: NewPasswordFormValues) => {
    setBanner(null);
    setInvalidToken(false);
    confirmMutation.mutate(values, {
      onSuccess: () => setSucceeded(true),
      onError: (error) => {
        if (isInvalidTokenError(error)) {
          setInvalidToken(true);
          return;
        }
        const fieldErrors = passwordResetFieldErrors(error);
        if (fieldErrors?.new_password_confirm?.[0]) {
          setError('newPasswordConfirm', { message: 'Passwords do not match.' });
          return;
        }
        setBanner(authErrorMessage(error, 'Unable to reset your password. Please try again.'));
      },
    });
  };

  if (succeeded) return <SuccessState />;

  return (
    <AuthFormScaffold
      title={
        <View style={styles.titleRow}>
          <Text style={authTitleStyles.base}>Set a new</Text>
          <Text style={[authTitleStyles.base, authTitleStyles.emphasis]}>password.</Text>
        </View>
      }
      footer={
        <Pressable
          onPress={handleSubmit(submit)}
          disabled={confirmMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Reset password"
          accessibilityState={{ disabled: confirmMutation.isPending }}
          style={[styles.primaryButton, confirmMutation.isPending && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Reset password</Text>
        </Pressable>
      }
    >
      <View style={styles.fields}>
        {invalidToken ? (
          <View style={styles.tokenError}>
            <Text style={styles.banner}>{INVALID_TOKEN_MESSAGE}</Text>
            <Pressable
              onPress={() => router.push('/(auth)/reset-password')}
              accessibilityRole="link"
              accessibilityLabel="Request a new token"
              style={styles.inlineLink}
            >
              <Text style={styles.errorLinkText}>Request a new token</Text>
            </Pressable>
          </View>
        ) : null}
        {!invalidToken ? (
          <>
            <Controller
              control={control}
              name="token"
              render={({ field }) => (
                <LabeledField
                  label="Reset token"
                  placeholder="Paste it here"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  contentPaddingVertical={spacing.passwordResetFieldPadY}
                />
              )}
            />
            {errors.token ? <Text style={styles.error}>{errors.token.message}</Text> : null}
            <Text style={styles.hint}>
              It&apos;s in the email, on the line that starts with token:
            </Text>
          </>
        ) : null}
        <Controller
          control={control}
          name="newPassword"
          render={({ field }) => (
            <LabeledField
              label="New password"
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              contentPaddingVertical={spacing.passwordResetFieldPadY}
            />
          )}
        />
        {errors.newPassword ? <Text style={styles.error}>{errors.newPassword.message}</Text> : null}
        <Text style={styles.hint}>{PASSWORD_HINT}</Text>
        <Controller
          control={control}
          name="newPasswordConfirm"
          render={({ field }) => (
            <LabeledField
              label="Confirm password"
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              contentPaddingVertical={spacing.passwordResetFieldPadY}
            />
          )}
        />
        {errors.newPasswordConfirm ? (
          <Text style={styles.error}>{errors.newPasswordConfirm.message}</Text>
        ) : null}
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      </View>
    </AuthFormScaffold>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { gap: spacing.authResetFieldGap },
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
  banner: { ...textStyle('caption'), color: colors.attention },
  tokenError: { gap: spacing.sliderCaptionGap },
  inlineLink: { alignSelf: 'flex-start', minHeight: componentSizes.minimumTapTarget },
  errorLinkText: {
    ...textStyle('caption'),
    color: colors.attention,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    height: componentSizes.authButtonHeight,
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...textStyle('button'), color: colors.white },
  disabled: { opacity: 0.6 },
  successSafeArea: { flex: 1, alignItems: 'center' },
  successContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.ml,
    paddingHorizontal: spacing.screenPadX,
  },
  successIcon: {
    width: componentSizes.passwordResetSuccessIcon,
    height: componentSizes.passwordResetSuccessIcon,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.nightShadow,
        shadowOffset: { width: 0, height: spacing.ms },
        shadowOpacity: 1,
        shadowRadius: spacing.xxl,
      },
      default: { elevation: spacing.sliderCaptionGap },
    }),
  },
  successTitle: { ...textStyle('cardTitle'), color: colors.ink },
  successBody: { ...textStyle('small'), color: colors.ink55, textAlign: 'center' },
  successButton: {
    height: componentSizes.passwordResetSignInHeight,
    paddingHorizontal: spacing.passwordResetSignInPaddingX,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sliderCaptionGap,
  },
  successButtonText: { ...textStyle('buttonSm'), color: colors.white },
  successCaption: { ...textStyle('legal'), color: colors.ink40 },
});
