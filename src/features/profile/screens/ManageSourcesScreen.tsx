import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useSourcesQuery, DEVICE_SOURCES } from '@/features/home';
import {
  StravaConnectButton,
  useHealthSync,
  useStravaConnect,
  type HealthSyncStatus,
} from '@/features/integrations';
import { sourceLabels } from '@/features/profile/lib/profileCopy';
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

function getHealthConnectAction({
  status,
  onConnect,
  onOpenSettings,
}: HealthConnectActionProps): ReactNode {
  if (status === 'needs_install') {
    return (
      <>
        <Text style={styles.healthConnectMessage}>Update Health Connect to keep syncing.</Text>
        <HealthConnectButton label="Open settings" onPress={onOpenSettings} />
      </>
    );
  }

  if (status === 'unavailable') {
    return (
      <Text style={styles.healthConnectMessage}>
        Health Connect isn&apos;t available on this phone.
      </Text>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Text style={styles.healthConnectMessage}>Couldn&apos;t connect Health Connect.</Text>
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

export default function ManageSourcesScreen() {
  const router = useRouter();
  const query = useSourcesQuery();
  const stravaConnect = useStravaConnect();
  const healthSync = useHealthSync();
  const sources = query.data ?? [];

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
          const showsHealthConnectAction =
            Platform.OS === 'android' && source === 'health_connect' && !isConnected;
          const healthConnectAction = showsHealthConnectAction
            ? getHealthConnectAction({
                status: healthSync.status,
                onConnect: healthSync.connect,
                onOpenSettings: healthSync.openSettings,
              })
            : null;
          return (
            <GlassCard key={source} variant="usualNote" radius={radii.md} padded={false}>
              <View style={isStrava || healthConnectAction ? styles.actionRow : styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.source}>{sourceLabels[source]}</Text>
                  <Text testID={`source-status-${source}`} style={styles.status}>
                    {isConnected ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
                {isStrava && !isConnected ? (
                  <>
                    {stravaConnect.errorMessage ? (
                      <Text style={styles.stravaError}>{stravaConnect.errorMessage}</Text>
                    ) : null}
                    <StravaConnectButton
                      disabled={
                        stravaConnect.status === 'connecting' ||
                        stravaConnect.status === 'exchanging'
                      }
                      onPress={stravaConnect.connect}
                    />
                  </>
                ) : null}
                {healthConnectAction}
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
  actionRow: { gap: spacing.sm, padding: spacing.fieldPadX },
  source: { ...typography.mealReviewRowTitle, color: colors.ink },
  status: { ...typography.usualRowSubtitle, color: colors.ink55 },
  stravaError: { ...typography.usualRowSubtitle, color: colors.ink62 },
  healthConnectMessage: { ...typography.usualRowSubtitle, color: colors.ink62 },
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
