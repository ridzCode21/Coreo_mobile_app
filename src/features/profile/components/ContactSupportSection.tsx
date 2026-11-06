import { Controller } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSendSupportMessageMutation } from '@/features/profile/api/contactSupportApi';
import {
  useContactSupportForm,
  type ContactSupportForm,
} from '@/features/profile/lib/useContactSupportForm';
import type { ContactSupportFormValues } from '@/features/profile/schemas';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

function SupportInput({
  form,
  label,
  name,
  placeholder,
  multiline = false,
}: {
  form: ContactSupportForm;
  label: string;
  name: keyof ContactSupportFormValues;
  placeholder: string;
  multiline?: boolean;
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
            editable={!form.isSending}
            multiline={multiline}
            onBlur={field.onBlur}
            onChangeText={(value) => {
              form.clearFieldError(name);
              field.onChange(value);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.ink45}
            style={[styles.input, multiline && styles.messageInput, error && styles.inputError]}
            value={field.value}
          />
        )}
      />
      {error?.message ? <Text style={styles.fieldError}>{error.message}</Text> : null}
    </View>
  );
}

export function ContactSupportSection({ isOnline }: { isOnline: boolean }) {
  const mutation = useSendSupportMessageMutation();
  const form = useContactSupportForm(mutation);
  const disabled = form.isSending || !isOnline;
  const failed = form.status === 'failed';

  return (
    <View style={styles.section} testID="account-contact-support-section">
      <Text style={styles.eyebrow}>Contact us</Text>
      <GlassCard variant="usualNote" padded={false} radius={radii.md}>
        <View style={styles.editor}>
          <SupportInput
            form={form}
            label="Subject"
            name="subject"
            placeholder="What's on your mind"
          />
          <SupportInput
            form={form}
            label="Message"
            multiline
            name="message"
            placeholder="Write to us and we'll write back."
          />
          {form.status === 'sent' ? (
            <Text style={styles.success}>{"Thanks, we'll write back."}</Text>
          ) : null}
          {failed ? (
            <Text style={styles.failed}>{"Something went wrong. Your message wasn't sent."}</Text>
          ) : null}
          <Pressable
            accessibilityLabel={failed ? 'Try again' : 'Send'}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={form.send}
            style={[styles.primaryButton, disabled && styles.disabled]}
            testID="contact-support-send-button"
          >
            {form.isSending ? <ActivityIndicator color={colors.white} /> : null}
            <Text style={styles.primaryButtonText}>
              {form.isSending ? 'Sending…' : failed ? 'Try again' : 'Send'}
            </Text>
          </Pressable>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  eyebrow: { ...typography.wellnessCardLabel, color: colors.ink55 },
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
  messageInput: { textAlignVertical: 'top' },
  inputError: { borderColor: colors.attention45, borderWidth: componentSizes.inputFocusBorder },
  fieldError: { ...typography.caption, color: colors.attention },
  success: { ...typography.caption, color: colors.success },
  failed: { ...typography.caption, color: colors.attention },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    height: componentSizes.contactSupportSendHeight,
    justifyContent: 'center',
  },
  primaryButtonText: { ...typography.button, color: colors.white },
  disabled: { opacity: 0.5 },
});
