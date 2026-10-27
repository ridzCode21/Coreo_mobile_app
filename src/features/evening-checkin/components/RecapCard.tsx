import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type Props = { label: string; fixLabel: string; lines: string[]; onFix: () => void };

export function RecapCard({ label, fixLabel, lines, onFix }: Props) {
  return (
    <GlassCard
      variant="light"
      radius={radii.eveningCheckInRecap}
      style={styles.card}
      contentPaddingVertical={spacing.lg}
      contentPaddingHorizontal={spacing.sheetTitleGap}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={fixLabel} onPress={onFix}>
          <Text style={styles.fix}>{fixLabel}</Text>
        </Pressable>
      </View>
      {lines.length ? (
        <View style={styles.lines}>
          {lines.map((line) => (
            <View key={line} style={styles.line}>
              <Svg
                width={componentSizes.eveningCheckInRecapIcon}
                height={componentSizes.eveningCheckInRecapIcon}
                viewBox="0 0 24 24"
                fill="none"
              >
                <Path
                  d="M20 6 9 17l-5-5"
                  stroke={colors.label}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.lineText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { ...textStyle('eveningCheckInLooksRight'), color: colors.ink },
  fix: { ...textStyle('eveningCheckInFix'), color: colors.ink50, textDecorationLine: 'underline' },
  lines: { gap: spacing.ms, marginTop: spacing.ms },
  line: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  lineText: { ...textStyle('eveningCheckInRecapLine'), color: colors.ink },
});
