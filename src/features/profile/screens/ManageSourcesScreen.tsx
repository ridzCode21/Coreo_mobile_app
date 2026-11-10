import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useSourcesQuery, DEVICE_SOURCES } from '@/features/home';
import {
  StravaConnectButton,
  stravaConnectErrorCode,
  stravaConnectErrorMessage,
  useDisconnectStravaMutation,
  useHealthSync,
  useStravaConnect,
  type HealthSyncStatus,
} from '@/features/integrations';
import { sourceLabels } from '@/features/profile/lib/profileCopy';
import { formatLastSynced } from '@/features/profile/lib/sourceQuietStatus';
import { BackButton } from '@/shared/components/BackButton';
import { GlassCard } from '@/shared/components/GlassCard';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

type HealthConnectActionProps = {
  status: HealthSyncStatus;
  onConnect: () => void;
  onOpenSettings: () => Promise<void>;
};

function HealthConnectAction({
  status,
  onConnect,
  onOpenSettings,
}: HealthConnectActionProps): ReactNode {
  if (status === 'needs_install') {
    return (
      <>
        <Text style={styles.rowMessage}>Update Health Connect to keep syncing.</Text>
        <HealthConnectButton label="Open settings" onPress={onOpenSettings} />
      </>
    );
  }

  if (status === 'unavailable') {
    return (
      <Text style={styles.rowMessage}>Health Connect isn&apos;t available on this phone.</Text>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Text style={styles.rowMessage}>Couldn&apos;t connect Health Connect.</Text>
        <HealthConnectButton label="Connect Health Connect" onPress={onConnect} />
      </>
    );
  }

  if (status === 'needs_permission' || status === 'syncing') {
    return (
      <HealthConnectButton
        disabled={status === 'syncing'}
        label="Connect Health Connect"
        onPress={onConnect}
      />
    );
  }

  return null;
}

type HealthConnectButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
};

function HealthConnectButton({ label, onPress, disabled = false }: HealthConnectButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.healthConnectButton}
    >
      <Text style={styles.healthConnectButtonText}>{label}</Text>
    </Pressable>
  );
}

type StravaSourceActionProps = {
  isConnected: boolean;
  connectErrorMessage: string | null;
  connectIsPending: boolean;
  onConnect: () => void;
  disconnectErrorMessage: string | null;
  disconnectIsPending: boolean;
  onDisconnect: () => void;
};

function StravaSourceAction({
  isConnected,
  connectErrorMessage,
  connectIsPending,
  onConnect,
  disconnectErrorMessage,
  disconnectIsPending,
  onDisconnect,
}: StravaSourceActionProps) {
  if (!isConnected) {
    return (
      <>
        {connectErrorMessage ? <Text style={styles.rowMessage}>{connectErrorMessage}</Text> : null}
        <StravaConnectButton disabled={connectIsPending} onPress={onConnect} />
      </>
    );
  }

  return (
    <>
      {disconnectErrorMessage ? (
        <Text style={styles.rowMessage}>{disconnectErrorMessage}</Text>
      ) : null}
      <Pressable
        accessibilityLabel="Disconnect Strava"
        accessibilityRole="button"
        accessibilityState={{ disabled: disconnectIsPending }}
        disabled={disconnectIsPending}
        onPress={onDisconnect}
        style={styles.disconnectAction}
      >
        <Text style={styles.disconnectActionText}>Disconnect Strava</Text>
      </Pressable>
    </>
  );
}

export default function ManageSourcesScreen() {
  const router = useRouter();
  const query = useSourcesQuery();
  const stravaConnect = useStravaConnect();
  const disconnectStrava = useDisconnectStravaMutation();
  const healthSync = useHealthSync();
  const sources = query.data ?? [];
  const disconnectErrorMessage = disconnectStrava.isError
    ? stravaConnectErrorMessage(stravaConnectErrorCode(disconnectStrava.error))
    : null;

  const confirmStravaDisconnect = () =>
    Alert.alert('Disconnect Strava?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => disconnectStrava.mutate() },
    ]);

  if (query.isError) {
    return (
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <View style={styles.error}>
          <QueryErrorState
            message="Unable to load connected sources."
            onRetry={() => query.refetch()}
            onBack={() => router.back()}
          />
        </View>
      </View>
    );
  }

  let content: ReactNode;
  if (query.isLoading) {
    content = <ActivityIndicator color={colors.ink45} />;
  } else {
    content = (
      <View style={styles.rows}>
        {DEVICE_SOURCES.map((source) => {
          const item = sources.find((candidate) => candidate.source === source);
          const isStrava = source === 'strava';
          const isConnected = item?.connected ?? false;
          const lastSyncedAt = isConnected ? item?.last_synced_at : null;
          const showsHealthConnectAction =
            Platform.OS === 'android' && source === 'health_connect' && !isConnected;
          const hasHealthConnectAction =
            showsHealthConnectAction &&
            healthSync.status !== 'checking' &&
            healthSync.status !== 'unsupported';
          return (
            <GlassCard key={source} variant="usualNote" radius={radii.md} padded={false}>
              <View style={isStrava || hasHealthConnectAction ? styles.actionRow : styles.row}>
                <View style={styles.rowInfo}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.source}>{sourceLabels[source]}</Text>
                    <Text testID={`source-status-${source}`} style={styles.rowSubtitle}>
                      {isConnected ? 'Connected' : 'Not connected'}
                    </Text>
                  </View>
                  {lastSyncedAt ? (
                    <Text testID={`source-last-synced-${source}`} style={styles.rowSubtitle}>
                      Last synced {formatLastSynced(lastSyncedAt)}
                    </Text>
                  ) : null}
                </View>
                {isStrava ? (
                  <StravaSourceAction
                    connectErrorMessage={stravaConnect.errorMessage}
                    connectIsPending={
                      stravaConnect.status === 'connecting' || stravaConnect.status === 'exchanging'
                    }
                    disconnectErrorMessage={disconnectErrorMessage}
                    disconnectIsPending={disconnectStrava.isPending}
                    isConnected={isConnected}
                    onConnect={stravaConnect.connect}
                    onDisconnect={confirmStravaDisconnect}
                  />
                ) : null}
                {hasHealthConnectAction ? (
                  <HealthConnectAction
                    status={healthSync.status}
                    onConnect={healthSync.connect}
                    onOpenSettings={healthSync.openSettings}
                  />
                ) : null}
              </View>
            </GlassCard>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Manage sources</Text>
          <View style={styles.headerSpacer} />
        </View>
        {content}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  title: { ...typography.cardTitle, color: colors.ink },
  rows: { gap: spacing.sm },
  row: {
    minHeight: componentSizes.profileKnowledgeMinHeight,
    paddingHorizontal: spacing.fieldPadX,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowInfo: { gap: spacing.xs },
  actionRow: { gap: spacing.sm, padding: spacing.fieldPadX },
  source: { ...typography.mealReviewRowTitle, color: colors.ink },
  rowSubtitle: { ...typography.usualRowSubtitle, color: colors.ink55 },
  rowMessage: { ...typography.usualRowSubtitle, color: colors.ink62 },
  disconnectAction: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  disconnectActionText: { ...typography.linkMd, color: colors.ink60 },
  healthConnectButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.sourceQuietAction,
    height: componentSizes.sheetChipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  healthConnectButtonText: { ...typography.sourceQuietAction, color: colors.white },
});
