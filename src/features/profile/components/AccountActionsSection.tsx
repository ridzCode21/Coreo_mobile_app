import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useDeleteAccountDataMutation,
  useDeleteAccountMutation,
  useExportDataMutation,
} from '@/features/profile/api/accountApi';
import { useSessionStore } from '@/features/auth';
import { ExportDataSheet } from '@/features/profile/components/ExportDataSheet';
import { SignOutAction } from '@/features/profile/components/SignOutAction';
import { downloadExportFile, writeExportFile } from '@/features/profile/lib/exportFile';
import type { DataExport } from '@/features/profile/api/accountApi';
import type { ExportDataSheetState } from '@/features/profile/lib/exportDataSheetCopy';
import { GlassCard } from '@/shared/components/GlassCard';
import { reportError } from '@/shared/lib/reportError';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
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

type AccountActionsSectionProps = {
  showLabel?: boolean;
};

export function AccountActionsSection({ showLabel = true }: AccountActionsSectionProps) {
  const exportData = useExportDataMutation();
  const deleteData = useDeleteAccountDataMutation();
  const deleteAccount = useDeleteAccountMutation();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [exportSheetVisible, setExportSheetVisible] = useState(false);
  const [exportState, setExportState] = useState<ExportDataSheetState>({ kind: 'working' });
  const [exportPayload, setExportPayload] = useState<DataExport | null>(null);
  const exportGeneration = useRef(0);

  const startExport = () => {
    const generation = exportGeneration.current + 1;
    exportGeneration.current = generation;
    setExportPayload(null);
    setExportState({ kind: 'working' });
    exportData.mutate(undefined, {
      onSuccess: (payload) => {
        if (exportGeneration.current !== generation) return;
        setExportPayload(payload);
        setExportState({ kind: 'done' });
      },
      onError: () => {
        if (exportGeneration.current !== generation) return;
        setExportState({ kind: 'failed' });
      },
    });
  };

  const openExport = () => {
    setExportSheetVisible(true);
    if (!isOnline) {
      exportGeneration.current += 1;
      setExportPayload(null);
      setExportState({ kind: 'offline' });
      return;
    }
    startExport();
  };

  const closeExport = () => {
    exportGeneration.current += 1;
    setExportSheetVisible(false);
  };

  const downloadExport = () => {
    if (!exportPayload) return;
    void writeExportFile(exportPayload)
      .then(downloadExportFile)
      .catch((error) => reportError(error, 'profile.export-data.download'));
  };
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
      {showLabel ? <Text style={styles.label}>Account</Text> : null}
      <GlassCard variant="usualNote" radius={radii.md} padded={false}>
        <AccountAction label="Export my data" onPress={openExport} />
        <AccountAction label="Delete my data" onPress={confirmDeleteData} />
        <AccountAction label="Delete my account" onPress={confirmDeleteAccount} />
      </GlassCard>
      <View style={styles.signOutAction}>
        <SignOutAction />
      </View>
      <ExportDataSheet
        visible={exportSheetVisible}
        state={exportState}
        onClose={closeExport}
        onRetry={startExport}
        onDownload={downloadExport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  label: { ...typography.wellnessCardLabel, color: colors.ink55, marginBottom: spacing.sm },
  signOutAction: { marginTop: spacing.ml },
  row: {
    minHeight: componentSizes.minimumTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.sm,
  },
  rowText: { ...typography.mealReviewRowTitle, color: colors.ink },
});
