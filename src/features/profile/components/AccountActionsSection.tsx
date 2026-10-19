import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import {
  useDeleteAccountDataMutation,
  useDeleteAccountMutation,
  useExportDataMutation,
} from '@/features/profile/api/accountApi';
import { useSessionStore } from '@/features/auth';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

type AccountActionProps = { label: string; onPress: () => void };

function AccountAction({ label, onPress }: AccountActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

export function AccountActionsSection() {
  const exportData = useExportDataMutation();
  const deleteData = useDeleteAccountDataMutation();
  const deleteAccount = useDeleteAccountMutation();

  const confirmExport = () =>
    Alert.alert('Export my data', 'Share a copy of your Coreo data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Export',
        onPress: () =>
          exportData.mutate(undefined, {
            onSuccess: (payload) => {
              void Share.share({ message: JSON.stringify(payload, null, 2) });
            },
          }),
      },
    ]);
  const confirmDeleteData = () =>
    Alert.alert('Delete my data', 'Delete your health data? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete my data', style: 'destructive', onPress: () => deleteData.mutate() },
    ]);
  const confirmDeleteAccount = () =>
    Alert.alert('Delete my account', 'Delete your account? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete my account',
        style: 'destructive',
        onPress: () =>
          deleteAccount.mutate(undefined, {
            onSuccess: () => useSessionStore.getState().signOut(),
          }),
      },
    ]);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Account</Text>
      <GlassCard variant="usualNote" radius={radii.md} padded={false}>
        <AccountAction label="Export my data" onPress={confirmExport} />
        <AccountAction label="Delete my data" onPress={confirmDeleteData} />
        <AccountAction label="Delete my account" onPress={confirmDeleteAccount} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.lg },
  label: { ...typography.wellnessCardLabel, color: colors.ink55 },
  row: {
    minHeight: componentSizes.minimumTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.sm,
  },
  rowText: { ...typography.mealReviewRowTitle, color: colors.ink },
});
