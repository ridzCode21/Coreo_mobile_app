import { StyleSheet, Text, View } from 'react-native';

import { WaveMark } from '@/shared/components/WaveMark';
import { ProfileCircle } from '@/shared/components/ProfileCircle';
import { colors, componentSizes, spacing, textStyle } from '@/shared/theme/tokens';
import { formatHeaderDate } from '@/features/home/lib/greeting';

type HomeHeaderProps = {
  now: Date;
  firstName?: string | null;
};

export function HomeHeader({ now, firstName }: HomeHeaderProps) {
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
      <View style={styles.trailing}>
        <Text style={styles.date}>{formatHeaderDate(now)}</Text>
        <ProfileCircle firstName={firstName} />
      </View>
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
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
