import { StyleSheet, Text, View } from 'react-native';

import { WaveMark } from '@/shared/components/WaveMark';
import { colors, componentSizes, spacing, textStyle } from '@/shared/theme/tokens';
import { formatHeaderDate } from '@/features/home/lib/greeting';

type HomeHeaderProps = {
  now: Date;
};

export function HomeHeader({ now }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <WaveMark
          size={componentSizes.homeHeaderMark}
          color={colors.ink60}
          strokeWidth={componentSizes.homeHeaderMarkStrokeWidth}
        />
        <Text style={styles.wordmark}>coreo</Text>
      </View>
      <Text style={styles.date}>{formatHeaderDate(now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.headerLogoGap,
  },
  wordmark: {
    ...textStyle('caption'),
    color: colors.ink50,
  },
  date: {
    ...textStyle('headerDate'),
    color: colors.ink40,
  },
});
