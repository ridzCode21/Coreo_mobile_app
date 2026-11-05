import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { useChangePasswordMutation } from '@/features/profile/api/passwordApi';
import {
  useChangePasswordForm,
  type ChangePasswordForm,
} from '@/features/profile/lib/useChangePasswordForm';
import type { ChangePasswordFormValues } from '@/features/profile/schemas';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

function PasswordInput({
  form,
  label,
  name,
}: {
  form: ChangePasswordForm;
  label: string;
  name: keyof ChangePasswordFormValues;
}) {
  const error = form.errors[name];
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <TextInput
            accessibilityLabel={label}
            editable={!form.isSaving}
            onBlur={field.onBlur}
            onChangeText={(value) => {
              form.clearFieldError(name);
              field.onChange(value);
            }}
            placeholder="••••••••"
            placeholderTextColor={colors.ink45}
            secureTextEntry
            style={[styles.input, error && styles.inputError]}
            value={field.value}
          />
        )}
      />
      {error?.message ? <Text style={styles.fieldError}>{error.message}</Text> : null}
    </View>
  );
}

export function PasswordSection({ isOnline }: { isOnline: boolean }) {
  const mutation = useChangePasswordMutation();
  const form = useChangePasswordForm(mutation);
  const disabled = form.isSaving || !isOnline;

  return (
    <View style={styles.section} testID="account-password-section">
      <Text style={styles.eyebrow}>Password</Text>
      {form.succeeded ? (
        <View style={styles.savedRow}>
          <Svg
            height={componentSizes.passwordChangeSuccessIcon}
            testID="account-password-success-icon"
            viewBox="0 0 24 24"
            width={componentSizes.passwordChangeSuccessIcon}
          >
            <Path
              d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
              fill="none"
              stroke={colors.success}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={componentSizes.passwordChangeSuccessStroke}
            />
            <Polyline
              fill="none"
              points="22 4 12 14.01 9 11.01"
              stroke={colors.success}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={componentSizes.passwordChangeSuccessStroke}
            />
          </Svg>
          <Text style={styles.saved}>Password changed.</Text>
        </View>
      ) : null}
      <GlassCard variant="usualNote" padded={false} radius={radii.md}>
        <View style={styles.editor}>
          <PasswordInput form={form} label="Current password" name="currentPassword" />
          <PasswordInput form={form} label="New password" name="newPassword" />
          <Text style={styles.hint}>
            At least 8 characters. Not just numbers, not too common, not too similar to your email
            or name.
          </Text>
          <PasswordInput form={form} label="Confirm new password" name="newPasswordConfirm" />
          <Pressable
            accessibilityLabel="Save new password"
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={form.save}
            style={[styles.primaryButton, disabled && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {form.isSaving ? 'Saving…' : 'Save new password'}
            </Text>
          </Pressable>
          {form.saveError ? <Text style={styles.fieldError}>{form.saveError}</Text> : null}
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  eyebrow: { ...typography.wellnessCardLabel, color: colors.ink55 },
  savedRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  saved: { ...typography.caption, color: colors.success },
  editor: { gap: spacing.sm, padding: spacing.fieldPadX },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.micro, color: colors.ink45 },
  input: {
    ...typography.inputValue,
    borderColor: colors.ink10,
    borderRadius: radii.legal,
    borderWidth: componentSizes.hairline,
    color: colors.ink,
    minHeight: componentSizes.minimumTapTarget,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.attention45, borderWidth: componentSizes.inputFocusBorder },
  fieldError: { ...typography.caption, color: colors.attention },
  hint: { ...typography.legal, color: colors.ink55 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  primaryButtonText: { ...typography.button, color: colors.white },
  disabled: { opacity: 0.5 },
});
