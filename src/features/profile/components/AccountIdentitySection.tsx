import { Controller } from 'react-hook-form';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';

import type { ProfileUser } from '@/features/auth';
import type { AccountNameFormValues } from '@/features/profile/schemas';
import { accountSinceSummary } from '@/features/profile/lib/profileCopy';
import type { AccountNameForm } from '@/features/profile/lib/useAccountNameForm';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, glass, radii, spacing, typography } from '@/shared/theme/tokens';

type AccountIdentitySectionProps = {
  user: ProfileUser;
  isOnline: boolean;
  nameForm: AccountNameForm;
};

function NameRow({
  label,
  value,
  placeholder,
  testID,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Edit ${label.toLowerCase()}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
      testID={`${testID}-row`}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text testID={`${testID}-value`} style={[styles.rowValue, !value && styles.placeholder]}>
        {value || placeholder}
      </Text>
    </Pressable>
  );
}

function NameEditor({ nameForm, isOnline }: { nameForm: AccountNameForm; isOnline: boolean }) {
  const disabled = nameForm.isSaving;
  const saveDisabled = disabled || !isOnline;
  const [focusedField, setFocusedField] = useState<keyof AccountNameFormValues | null>(null);

  if (nameForm.mode === 'discarding') {
    return (
      <GlassCard variant="light" radius={radii.md} style={styles.promptCard}>
        <Text style={styles.promptTitle}>Discard changes?</Text>
        <Text style={styles.promptText}>{"You've changed your name. Leave without saving?"}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Keep editing"
            accessibilityRole="button"
            onPress={nameForm.keepEditing}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Keep editing</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Discard"
            accessibilityRole="button"
            onPress={nameForm.confirmDiscard}
            style={styles.attentionButton}
          >
            <Text style={styles.attentionButtonText}>Discard</Text>
          </Pressable>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={styles.editor}>
      <Controller
        control={nameForm.control}
        name="first_name"
        render={({ field }) => (
          <TextInput
            accessibilityLabel="First name"
            editable={!disabled}
            onBlur={() => {
              field.onBlur();
              setFocusedField(null);
            }}
            onChangeText={(value) => {
              nameForm.clearSaveError();
              field.onChange(value);
            }}
            onFocus={() => setFocusedField('first_name')}
            style={[
              styles.input,
              nameForm.errors.first_name && styles.inputError,
              focusedField === 'first_name' && !nameForm.errors.first_name && styles.inputFocused,
            ]}
            value={field.value}
          />
        )}
      />
      {nameForm.errors.first_name ? (
        <Text style={styles.fieldError}>{nameForm.errors.first_name.message}</Text>
      ) : null}
      {nameForm.saveError ? <Text style={styles.fieldError}>{nameForm.saveError}</Text> : null}
      <Controller
        control={nameForm.control}
        name="last_name"
        render={({ field }) => (
          <TextInput
            accessibilityLabel="Last name"
            editable={!disabled}
            onBlur={() => {
              field.onBlur();
              setFocusedField(null);
            }}
            onChangeText={(value) => {
              nameForm.clearSaveError();
              field.onChange(value);
            }}
            onFocus={() => setFocusedField('last_name')}
            style={[styles.input, focusedField === 'last_name' && styles.inputFocused]}
            value={field.value}
          />
        )}
      />
      {disabled ? (
        <View style={styles.saving}>
          <ActivityIndicator color={colors.ink55} />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={nameForm.requestCancel}
          style={[styles.secondaryButton, disabled && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Save name"
          accessibilityRole="button"
          accessibilityState={{ disabled: saveDisabled }}
          disabled={saveDisabled}
          onPress={nameForm.save}
          style={[styles.primaryButton, saveDisabled && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Save name</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AccountIdentitySection({ user, isOnline, nameForm }: AccountIdentitySectionProps) {
  const editing = nameForm.mode === 'editing' || nameForm.mode === 'discarding';
  return (
    <View style={styles.section}>
      <View style={styles.header} testID="account-header">
        <LinearGradient
          colors={glass.profileAvatar.gradient}
          end={glass.profileAvatar.end}
          start={glass.profileAvatar.start}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{user.first_name.slice(0, 1).toUpperCase()}</Text>
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.name} testID="account-header-name">
            {user.first_name}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.membership}>{accountSinceSummary(user.created_at)}</Text>
        </View>
      </View>
      {!isOnline ? (
        <Text style={styles.offline}>{"You're offline. Reconnect to save changes."}</Text>
      ) : null}
      {nameForm.didSave ? (
        <View style={styles.savedRow}>
          <Svg
            height={spacing.sm}
            testID="account-name-saved-icon"
            viewBox="0 0 24 24"
            width={spacing.sm}
          >
            <Polyline
              fill="none"
              points="20 6 9 17 4 12"
              stroke={colors.success}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={componentSizes.savedCheckStroke}
            />
          </Svg>
          <Text style={styles.saved}>Name saved.</Text>
        </View>
      ) : null}
      <View style={styles.nameSection} testID="account-name-section">
        <Text style={styles.eyebrow}>Your name</Text>
        <GlassCard variant="usualNote" padded={false} radius={radii.md}>
          {editing ? (
            <NameEditor isOnline={isOnline} nameForm={nameForm} />
          ) : (
            <>
              <NameRow
                label="First name"
                onPress={nameForm.startEdit}
                placeholder="Add a first name"
                testID="account-first-name"
                value={user.first_name}
              />
              <NameRow
                label="Last name"
                onPress={nameForm.startEdit}
                placeholder="Add a last name"
                testID="account-last-name"
                value={user.last_name}
              />
            </>
          )}
        </GlassCard>
      </View>
      <View style={styles.timezoneSection}>
        <Text style={styles.eyebrow}>Time zone</Text>
        <GlassCard variant="usualNote" padded={false} radius={radii.md}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Time zone</Text>
            <Text style={styles.rowValue} testID="account-timezone-value">
              {user.timezone}
            </Text>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: componentSizes.profileAvatar,
    justifyContent: 'center',
    width: componentSizes.profileAvatar,
  },
  avatarText: { ...typography.profileAvatar, color: colors.white },
  headerText: { flex: 1, gap: spacing.xs },
  name: { ...typography.cardTitle, color: colors.ink },
  email: { ...typography.small, color: colors.ink65 },
  membership: { ...typography.small, color: colors.ink55 },
  offline: { ...typography.caption, color: colors.attention },
  saved: { ...typography.caption, color: colors.success },
  savedRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  nameSection: { gap: spacing.sm },
  timezoneSection: { gap: spacing.sm },
  eyebrow: { ...typography.wellnessCardLabel, color: colors.ink55 },
  row: {
    minHeight: componentSizes.profileRowMinHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.sm,
  },
  rowLabel: { ...typography.mealReviewRowTitle, color: colors.ink },
  rowValue: { ...typography.small, color: colors.ink65, marginTop: spacing.xs },
  placeholder: { color: colors.ink45 },
  editor: { gap: spacing.sm, padding: spacing.fieldPadX },
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
  inputFocused: {
    borderColor: colors.profileInputFocus,
    borderWidth: componentSizes.inputFocusBorder,
  },
  fieldError: { ...typography.caption, color: colors.attention },
  saving: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  savingText: { ...typography.caption, color: colors.ink55 },
  promptCard: { margin: spacing.fieldPadX },
  promptTitle: { ...typography.mealReviewRowTitle, color: colors.ink },
  promptText: { ...typography.small, color: colors.ink65, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  primaryButtonText: { ...typography.button, color: colors.white },
  attentionButton: {
    alignItems: 'center',
    backgroundColor: colors.attention12,
    borderColor: colors.attention25,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    flex: 1,
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  attentionButtonText: { ...typography.button, color: colors.attention },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.ink10,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    flex: 1,
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  secondaryButtonText: { ...typography.button, color: colors.ink },
  disabled: { opacity: 0.5 },
});
