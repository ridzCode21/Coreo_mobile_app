import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import {
  useDeleteAccountDataMutation,
  useDeleteAccountMutation,
  useExportDataMutation,
} from '@/features/profile/api/accountApi';
import { useSessionStore } from '@/features/auth';
import { ExportDataSheet } from '@/features/profile/components/ExportDataSheet';
import { DeleteAccountSheet } from '@/features/profile/components/DeleteAccountSheet';
import { SignOutAction } from '@/features/profile/components/SignOutAction';
import type { DeleteAccountStep } from '@/features/profile/lib/deleteAccountCopy';
import { downloadExportFile, writeExportFile } from '@/features/profile/lib/exportFile';
import type { DataExport } from '@/features/profile/api/accountApi';
import type { ExportDataSheetState } from '@/features/profile/lib/exportDataSheetCopy';
import { GlassCard } from '@/shared/components/GlassCard';
import { reportError } from '@/shared/lib/reportError';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

type AccountActionProps = { hidden?: boolean; label: string; onPress: () => void };

function AccountAction({ hidden = false, label, onPress }: AccountActionProps) {
  return (
    <Pressable
      accessibilityElementsHidden={hidden}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessible={!hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

type AccountActionsSectionProps = {
  showLabel?: boolean;
  accountEmail?: string;
};

export function AccountActionsSection({
  showLabel = true,
  accountEmail = '',
}: AccountActionsSectionProps) {
  const router = useRouter();
  const exportData = useExportDataMutation();
  const deleteData = useDeleteAccountDataMutation();
  const deleteAccount = useDeleteAccountMutation();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [exportSheetVisible, setExportSheetVisible] = useState(false);
  const [exportState, setExportState] = useState<ExportDataSheetState>({ kind: 'working' });
  const [exportPayload, setExportPayload] = useState<DataExport | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteAccountStep | null>(null);
  const [typedEmail, setTypedEmail] = useState('');
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
  const closeDeleteAccount = () => {
    setDeleteStep(null);
    setTypedEmail('');
  };

  const confirmDeleteAccount = () => {
    if (!isOnline) {
      setDeleteStep({ kind: 'offline' });
      return;
    }
    setDeleteStep({ kind: 'deleting' });
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        await useSessionStore.getState().signOut();
        setDeleteStep({ kind: 'deleted' });
      },
      onError: () => setDeleteStep({ kind: 'failed' }),
    });
  };
  const goToConfirmEmail = () => setDeleteStep({ kind: 'confirmEmail' });

  const openExportFromDelete = () => {
    closeDeleteAccount();
    openExport();
  };

  return (
    <View style={styles.section}>
      {showLabel ? <Text style={styles.label}>Account</Text> : null}
      <GlassCard variant="usualNote" radius={radii.md} padded={false}>
        <AccountAction label="Export my data" onPress={openExport} />
        <AccountAction label="Delete my data" onPress={confirmDeleteData} />
        <AccountAction
          hidden={deleteStep !== null}
          label="Delete my account"
          onPress={() => setDeleteStep({ kind: 'warning' })}
        />
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
      <DeleteAccountSheet
        accountEmail={accountEmail}
        onBack={goToConfirmEmail}
        onCancel={closeDeleteAccount}
        onChangeTypedEmail={setTypedEmail}
        onConfirmDelete={confirmDeleteAccount}
        onContinue={goToConfirmEmail}
        onOpenExport={openExportFromDelete}
        onRetry={confirmDeleteAccount}
        onStartOver={() => router.replace('/(public)/first-open' as Href)}
        step={deleteStep ?? { kind: 'warning' }}
        typedEmail={typedEmail}
        visible={deleteStep !== null}
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
