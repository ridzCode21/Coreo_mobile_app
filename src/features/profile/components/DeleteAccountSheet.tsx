import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { DeleteAccountStep } from '@/features/profile/lib/deleteAccountCopy';
import { matchesAccountEmail } from '@/features/profile/lib/deleteAccountCopy';
import { MealSheetSkyFrame } from '@/shared/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/shared/components/MealSheetSubmitButton';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type DeleteAccountSheetProps = {
  visible: boolean;
  step: DeleteAccountStep;
  accountEmail: string;
  typedEmail: string;
  onChangeTypedEmail: (value: string) => void;
  onContinue: () => void;
  onOpenExport: () => void;
  onCancel: () => void;
  onConfirmDelete: () => void;
  onRetry: () => void;
  onBack: () => void;
  onStartOver: () => void;
};

function AttentionButton({
  label,
  disabled = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.attentionButton, disabled && styles.disabled]}
    >
      <Text style={styles.attentionButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  topGap = false,
}: {
  label: string;
  onPress: () => void;
  topGap?: boolean;
}) {
  return (
    <LinearGradient
      colors={glass.signOutSheetSecondary.gradient}
      end={glass.signOutSheetSecondary.end}
      start={glass.signOutSheetSecondary.start}
      style={[styles.secondary, topGap && styles.secondaryTopGap]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.secondaryPressable}
      >
        <Text style={styles.secondaryText}>{label}</Text>
      </Pressable>
    </LinearGradient>
  );
}

function WarningContent({
  onContinue,
  onOpenExport,
  onCancel,
}: Pick<DeleteAccountSheetProps, 'onContinue' | 'onOpenExport' | 'onCancel'>) {
  return (
    <>
      <View style={styles.bullets}>
        <Bullet text="Your account and sign-in details" />
        <Bullet text="All meals, sessions, and notes" />
        <Bullet text="Everything Coreo learned about you" />
      </View>
      <View style={styles.note}>
        <Text style={styles.noteText}>Before you go — </Text>
        <Pressable
          accessibilityLabel="export your data"
          accessibilityRole="button"
          onPress={onOpenExport}
        >
          <Text style={styles.exportLink}>export your data</Text>
        </Pressable>
        <Text style={styles.noteText}>{" if you'd like a copy."}</Text>
      </View>
      <AttentionButton label="Continue" onPress={onContinue} />
      <SecondaryButton label="Cancel" onPress={onCancel} />
    </>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMarker}>—</Text>
      <Text style={styles.bullet}>{text}</Text>
    </View>
  );
}

function ConfirmEmailContent({
  accountEmail,
  typedEmail,
  onChangeTypedEmail,
  onConfirmDelete,
  onCancel,
}: Pick<
  DeleteAccountSheetProps,
  'accountEmail' | 'typedEmail' | 'onChangeTypedEmail' | 'onConfirmDelete' | 'onCancel'
>) {
  const canDelete = matchesAccountEmail(typedEmail, accountEmail);
  return (
    <>
      <View style={styles.field}>
        <Text style={styles.eyebrow}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={onChangeTypedEmail}
          placeholder={accountEmail}
          placeholderTextColor={colors.ink45}
          style={styles.input}
          value={typedEmail}
        />
      </View>
      <AttentionButton disabled={!canDelete} label="Delete my account" onPress={onConfirmDelete} />
      <SecondaryButton label="Cancel" onPress={onCancel} />
    </>
  );
}

export function DeleteAccountSheet({
  visible,
  step,
  accountEmail,
  typedEmail,
  onChangeTypedEmail,
  onContinue,
  onOpenExport,
  onCancel,
  onConfirmDelete,
  onRetry,
  onBack,
  onStartOver,
}: DeleteAccountSheetProps) {
  const { title, subtitle } = deleteAccountSheetCopy(step);

  return (
    <MealSheetSkyFrame visible={visible} title={title} subtitle={subtitle} onClose={onCancel}>
      <DeleteAccountSheetContent
        accountEmail={accountEmail}
        onBack={onBack}
        onCancel={onCancel}
        onChangeTypedEmail={onChangeTypedEmail}
        onConfirmDelete={onConfirmDelete}
        onContinue={onContinue}
        onOpenExport={onOpenExport}
        onRetry={onRetry}
        onStartOver={onStartOver}
        step={step}
        typedEmail={typedEmail}
      />
    </MealSheetSkyFrame>
  );
}

function deleteAccountSheetCopy(step: DeleteAccountStep) {
  switch (step.kind) {
    case 'warning':
      return {
        title: 'Delete your account?',
        subtitle:
          "This closes everything — your account, your history, all of it. It can't be undone.",
      };
    case 'confirmEmail':
      return {
        title: 'Type your email to confirm',
        subtitle: 'Type the email on this account. We want to be sure this is you.',
      };
    case 'deleting':
    case 'failed':
    case 'offline':
    case 'deleted':
      return { title: 'Delete my account', subtitle: '' };
  }
}

function DeleteAccountSheetContent({
  accountEmail,
  typedEmail,
  step,
  onChangeTypedEmail,
  onContinue,
  onOpenExport,
  onCancel,
  onConfirmDelete,
  onRetry,
  onBack,
  onStartOver,
}: Omit<DeleteAccountSheetProps, 'visible'>) {
  switch (step.kind) {
    case 'warning':
      return (
        <WarningContent onCancel={onCancel} onContinue={onContinue} onOpenExport={onOpenExport} />
      );
    case 'confirmEmail':
      return (
        <ConfirmEmailContent
          accountEmail={accountEmail}
          onCancel={onCancel}
          onChangeTypedEmail={onChangeTypedEmail}
          onConfirmDelete={onConfirmDelete}
          typedEmail={typedEmail}
        />
      );
    case 'deleting':
      return (
        <View style={styles.status}>
          <ActivityIndicator accessibilityLabel="Closing your account" color={colors.ink55} />
          <Text style={styles.statusText}>Closing your account…</Text>
        </View>
      );
    case 'failed':
      return (
        <>
          <View style={styles.status}>
            <Text style={styles.statusText}>Something went wrong. Your account is still open.</Text>
          </View>
          <MealSheetSubmitButton busy={false} label="Retry" onPress={onRetry} />
          <SecondaryButton label="Back" onPress={onBack} />
        </>
      );
    case 'offline':
      return (
        <>
          <View style={styles.status}>
            <Text style={styles.statusText}>
              {"You're offline. Account deletion needs a connection. Try when you're back online."}
            </Text>
          </View>
          <SecondaryButton label="Back" onPress={onBack} topGap />
        </>
      );
    case 'deleted':
      return (
        <>
          <View style={styles.status}>
            <Text style={styles.statusText}>Your account is gone. Start fresh any time.</Text>
          </View>
          <MealSheetSubmitButton busy={false} label="Start over" onPress={onStartOver} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  attentionButton: {
    alignItems: 'center',
    backgroundColor: colors.attention12,
    borderColor: colors.attention25,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: componentSizes.sheetControlHeight,
    paddingHorizontal: spacing.lg,
  },
  attentionButtonText: { ...textStyle('buttonSm'), color: colors.attention },
  bullet: { ...textStyle('bodySm'), color: colors.ink65 },
  bulletMarker: { ...textStyle('bodySm'), color: colors.attention70 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bullets: { gap: spacing.sm, marginTop: spacing.lg },
  disabled: { opacity: 0.46 },
  eyebrow: { ...textStyle('buttonSm'), color: colors.ink55 },
  exportLink: { ...textStyle('bodySm'), color: colors.attention, textDecorationLine: 'underline' },
  field: { gap: spacing.xs, marginTop: spacing.lg },
  input: {
    ...textStyle('bodySm'),
    borderColor: colors.ink10,
    borderRadius: radii.legal,
    borderWidth: componentSizes.hairline,
    color: colors.ink,
    minHeight: componentSizes.minimumTapTarget,
    paddingHorizontal: spacing.md,
  },
  note: {
    alignItems: 'center',
    backgroundColor: colors.attention08,
    borderColor: colors.attention18,
    borderRadius: radii.legal,
    borderWidth: componentSizes.hairline,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noteText: { ...textStyle('bodySm'), color: colors.ink65 },
  secondary: {
    alignItems: 'center',
    borderColor: glass.signOutSheetSecondary.border,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    marginTop: componentSizes.hairline,
    minHeight: componentSizes.sheetControlHeight,
    overflow: 'hidden',
  },
  secondaryPressable: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    minHeight: componentSizes.sheetControlHeight,
  },
  secondaryText: { ...textStyle('buttonSm'), color: colors.ink },
  secondaryTopGap: { marginTop: spacing.lg },
  status: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.4),
    borderColor: withAlpha(colors.white, 0.5),
    borderRadius: radii.afterSnapMacro,
    borderWidth: componentSizes.hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    minHeight: componentSizes.sheetControlHeight,
    paddingHorizontal: spacing.ml,
    paddingVertical: spacing.sm,
  },
  statusText: { ...textStyle('bodySm'), color: colors.ink65, flexShrink: 1 },
});
