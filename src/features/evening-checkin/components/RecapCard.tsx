import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type Props = { label: string; fixLabel: string; lines: string[]; onFix: () => void };

export function RecapCard({ label, fixLabel, lines, onFix }: Props) {
  return (
    <GlassCard
      variant="eveningCheckInRecap"
      radius={radii.eveningCheckInRecap}
      style={styles.card}
      contentPaddingVertical={spacing.eveningCheckInCardPadY}
      contentPaddingHorizontal={spacing.eveningCheckInCardPadX}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fixLabel}
          onPress={onFix}
          style={styles.fixWrap}
        >
          <Text style={styles.fix}>{fixLabel}</Text>
        </Pressable>
      </View>
      {lines.length ? (
        <View style={styles.lines}>
          {lines.map((line, index) => (
            // Lines can repeat, so the position is part of the key; the list never reorders.
            <View key={`${index}:${line}`} style={styles.line}>
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
  card: {
    marginTop: spacing.lg,
    shadowOffset: { width: 0, height: componentSizes.eveningCheckInRecapShadowOffset },
    shadowRadius: componentSizes.eveningCheckInRecapShadowRadius,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { ...textStyle('eveningCheckInLooksRight'), color: colors.ink },
  // React Native cannot offset an underline, so the line is drawn as a bottom border 3px below.
  fixWrap: {
    borderBottomColor: colors.ink50,
    borderBottomWidth: componentSizes.hairline,
    paddingBottom: componentSizes.eveningCheckInFixUnderlineGap,
  },
  fix: { ...textStyle('eveningCheckInFix'), color: colors.ink50 },
  lines: { gap: spacing.eveningCheckInRecapGap, marginTop: spacing.ms },
  line: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  lineText: { ...textStyle('eveningCheckInRecapLine'), color: colors.ink },
});
