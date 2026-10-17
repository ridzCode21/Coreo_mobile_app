import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatSessionSubtitle } from '@/features/fitness/lib/trainingWeekFormat';
import { GlassCard, type GlassCardVariant } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { TrainingWeekSession } from '@/shared/types/trainingWeek';

type Props = { session: TrainingWeekSession };

export function TrainingWeekRow({ session }: Props) {
  const done = session.status === 'done';
  const isToday = session.status === 'today';
  const variant: GlassCardVariant = done ? 'usualCard' : isToday ? 'chipSelected' : 'usualNote';

  return (
    <GlassCard variant={variant} radius={radii.ml} padded={false} blurred={false}>
      <View style={styles.row}>
        {done ? (
          <View style={styles.doneCircle}>
            <Svg
              width={componentSizes.fitnessWeekCheckIcon}
              height={componentSizes.fitnessWeekCheckIcon}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Path
                d="M4 12l5 5 11-11"
                stroke={colors.white}
                strokeWidth={componentSizes.planDoneStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        ) : (
          <Svg width={spacing.xxl} height={spacing.xxl}>
            <Circle
              cx={spacing.xxl / 2}
              cy={spacing.xxl / 2}
              r={(spacing.xxl - componentSizes.hairline * 2) / 2}
              fill={withAlpha(colors.ink, isToday ? 0.12 : 0.08)}
              stroke={withAlpha(colors.ink, isToday ? 0.2 : 0.15)}
              strokeWidth={componentSizes.hairline}
            />
          </Svg>
        )}
        <View style={styles.copy}>
          <Text style={[styles.title, done && styles.titleDone, isToday && styles.titleToday]}>
            {session.name}
          </Text>
          <Text
            style={[styles.subtitle, done && styles.subtitleDone, isToday && styles.subtitleToday]}
          >
            {formatSessionSubtitle(session)}
          </Text>
        </View>
        {isToday ? (
          <Svg
            width={componentSizes.replaceBackIcon}
            height={componentSizes.replaceBackIcon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <Path
              d="M9 18l6-6-6-6"
              stroke={colors.ink70}
              strokeWidth={componentSizes.planHeaderStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ml,
    paddingVertical: spacing.fieldPadY,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  doneCircle: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: { ...textStyle('fitnessRowTitleMuted'), color: colors.ink70 },
  titleDone: { ...textStyle('fullPlanMealName'), color: colors.ink },
  titleToday: { ...textStyle('fullPlanMealNameNext'), color: colors.ink },
  subtitle: { ...textStyle('cardHint'), color: colors.ink45, marginTop: spacing.sheetSubtitleGap },
  subtitleDone: { color: colors.ink50 },
  subtitleToday: { color: colors.ink55 },
});
