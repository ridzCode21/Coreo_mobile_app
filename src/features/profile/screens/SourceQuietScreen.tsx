import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLastNightQuery, useSourcesQuery } from '@/features/home';
import { BackButton } from '@/shared/components/BackButton';
import { sourceLabels } from '@/features/profile/lib/profileCopy';
import {
  buildConnectedSummary,
  findQuietSource,
  formatLastSynced,
  formatRecoveryValue,
  formatSleepDuration,
  reconnectRouteForSource,
} from '@/features/profile/lib/sourceQuietStatus';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  typography,
} from '@/shared/theme/tokens';

export default function SourceQuietScreen() {
  const router = useRouter();
  const query = useSourcesQuery();
  const lastNightQuery = useLastNightQuery();
  const now = new Date();

  let content: ReactNode;
  if (query.isLoading) {
    content = <ActivityIndicator color={colors.ink45} />;
  } else if (query.isError) {
    content = <Text style={styles.status}>Unable to load connected sources.</Text>;
  } else {
    const sources = query.data ?? [];
    const quietSource = findQuietSource(sources, now);

    if (!quietSource) {
      content = <Text style={styles.status}>All sources are syncing normally.</Text>;
    } else {
      const label = sourceLabels[quietSource.source];
      const connectedSummary = buildConnectedSummary(sources, now);
      const reconnectRoute = reconnectRouteForSource(quietSource.source);
      const reconnect = () => {
        if (reconnectRoute.kind === 'settings') {
          void Linking.openSettings();
          return;
        }

        router.push(reconnectRoute.href);
      };

      content = (
        <>
          <GlassCard variant="sourceQuietCard" radius={radii.dietNextMeal}>
            <Text style={styles.cardTitle}>{`${label} stopped talking to me.`}</Text>
            <Text
              style={styles.body}
            >{`Last synced ${formatLastSynced(quietSource.last_synced_at, now)}.`}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={`Reconnect ${label}`}
                accessibilityRole="button"
                onPress={reconnect}
                style={styles.reconnect}
              >
                <Text style={styles.reconnectText}>{`Reconnect ${label}`}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Remind me later"
                accessibilityRole="button"
                onPress={() => router.back()}
              >
                <Text style={styles.dismiss}>Remind me later</Text>
              </Pressable>
            </View>
          </GlassCard>
          {lastNightQuery.data?.sleep ? (
            <View style={styles.lastNight}>
              <Text style={styles.lastNightLabel}>Last night</Text>
              <View style={styles.lastNightRows}>
                <GlassCard variant="planRowSkipped" radius={radii.control} padded={false}>
                  <View style={styles.lastNightRow}>
                    <Text style={styles.lastNightRowLabel}>Sleep</Text>
                    <View style={styles.lastNightValueGroup}>
                      <Text style={styles.lastNightValue}>
                        {formatSleepDuration(lastNightQuery.data.sleep.hours)}
                      </Text>
                      {lastNightQuery.data.sleep.estimate ? (
                        <View style={styles.estimateBadge}>
                          <Text style={styles.estimateText}>Estimate</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </GlassCard>
                <GlassCard variant="planRowSkipped" radius={radii.control} padded={false}>
                  <View style={styles.lastNightRow}>
                    <Text style={styles.lastNightRowLabel}>Recovery</Text>
                    <Text style={styles.recoveryValue}>
                      {formatRecoveryValue(lastNightQuery.data.recovery)}
                    </Text>
                  </View>
                </GlassCard>
              </View>
            </View>
          ) : null}
          {connectedSummary ? (
            <GlassCard variant="usualNote" radius={radii.md} padded={false} style={styles.footer}>
              <View style={styles.footerContent}>
                <View style={styles.footerCopy}>
                  <Text style={styles.footerTitle}>Connected</Text>
                  <Text style={styles.footerSubtitle}>{connectedSummary}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Manage"
                  accessibilityRole="button"
                  onPress={() => router.push('/profile/manage-sources')}
                  style={styles.manage}
                >
                  <Text style={styles.manageText}>Manage</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : null}
        </>
      );
    }
  }

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.eyebrow}>Sources</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.bodyContent}>{content}</View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  eyebrow: { ...typography.sourceQuietNavLabel, color: colors.ink45 },
  bodyContent: { flex: 1, gap: spacing.md, marginTop: spacing.xl },
  cardTitle: { ...typography.cardTitle, color: colors.ink },
  body: { ...textStyle('sourceQuietBody'), color: colors.ink62, marginTop: spacing.sm },
  actions: { alignItems: 'center', flexDirection: 'row', gap: spacing.ms, marginTop: spacing.lg },
  reconnect: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.sourceQuietAction,
    height: componentSizes.sheetChipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  reconnectText: { ...typography.sourceQuietAction, color: colors.white },
  dismiss: {
    ...typography.sourceQuietDismiss,
    color: colors.ink50,
    textDecorationLine: 'underline',
  },
  lastNight: { marginTop: spacing.md },
  lastNightLabel: {
    ...typography.sourceQuietLastNightLabel,
    color: colors.label,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs / 2,
  },
  lastNightRows: { gap: spacing.sm },
  lastNightRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.planMealRowPaddingX,
    paddingVertical: spacing.planMealRowPaddingY,
  },
  lastNightRowLabel: { ...typography.sourceQuietRowLabel, color: colors.ink },
  lastNightValueGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sliderCaptionGap,
  },
  lastNightValue: { ...typography.sourceQuietRowValue, color: colors.ink },
  estimateBadge: {
    alignItems: 'center',
    backgroundColor: colors.ink10,
    borderRadius: radii.asOfBadge,
    height: componentSizes.sourceQuietEstimateHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  estimateText: { ...typography.sourceQuietEstimate, color: colors.ink55 },
  recoveryValue: { ...typography.rightNowPattern, color: colors.ink45 },
  footer: { marginTop: 'auto' },
  footerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.planMealRowPaddingY,
  },
  footerCopy: { flex: 1, marginRight: spacing.md },
  footerTitle: { ...typography.sourceQuietFooterTitle, color: colors.ink },
  footerSubtitle: {
    ...typography.sourceQuietFooterSubtitle,
    color: colors.ink50,
    marginTop: spacing.sheetSubtitleGap,
  },
  manage: {
    alignItems: 'center',
    backgroundColor: colors.labelPreviewBorder,
    borderColor: colors.labelPreviewStrong,
    borderRadius: radii.mealDetailChip,
    borderWidth: componentSizes.hairline,
    height: componentSizes.dietWeightChipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  manageText: { ...typography.sourceQuietManagePill, color: colors.ink60 },
  status: { ...textStyle('sourceQuietBody'), color: colors.ink62 },
});
