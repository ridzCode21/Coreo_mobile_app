import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

const SOURCE_LABELS: Record<SourceStatus['source'], string> = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  strava: 'Strava',
};

const SOURCE_ICONS: Record<
  SourceStatus['source'],
  { path: string; strokeWidth: number; circle?: { cx: string; cy: string; r: string } }
> = {
  apple_health: {
    path: 'M20 6L9 17l-5-5',
    strokeWidth: componentSizes.readingSourceIconStrokeWidth,
  },
  // Frame 10b has no Health Connect row, so retain the existing connected-source checkmark.
  health_connect: {
    path: 'M20 6L9 17l-5-5',
    strokeWidth: componentSizes.readingSourceIconStrokeWidth,
  },
  strava: {
    path: 'M12 4v3M12 17v3M4 12h3M17 12h3',
    strokeWidth: componentSizes.readingStravaSourceIconStrokeWidth,
    circle: { cx: '12', cy: '12', r: '5' },
  },
};

type ReadingYouCardProps = {
  sources: SourceStatus[];
};

export function ReadingYouCard({ sources }: ReadingYouCardProps) {
  const connected = sources.filter((source) => source.connected);
  if (connected.length === 0) return null;

  return (
    <GlassCard variant="light" radius={radii.ml} padded={false} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.label}>Reading you</Text>
        <View style={styles.sources}>
          {connected.map((source) => {
            const icon = SOURCE_ICONS[source.source];
            return (
              <View key={source.source} style={styles.sourceRow}>
                <Svg
                  width={componentSizes.readingSourceIcon}
                  height={componentSizes.readingSourceIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Path
                    d={icon.path}
                    stroke={colors.label}
                    strokeWidth={icon.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {icon.circle ? (
                    <Circle {...icon.circle} stroke={colors.label} strokeWidth={icon.strokeWidth} />
                  ) : null}
                </Svg>
                <Text style={styles.sourceText}>
                  {SOURCE_LABELS[source.source]} — live, syncing now
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  content: {
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  label: {
    ...textStyle('readingCardLabel'),
    color: colors.label,
  },
  sources: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceText: {
    ...textStyle('small'),
    color: colors.ink,
    flexShrink: 1,
  },
});
