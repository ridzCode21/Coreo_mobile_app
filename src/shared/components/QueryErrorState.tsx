import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, glass, radii, spacing, typography } from '@/shared/theme/tokens';

type QueryErrorStateProps = {
  message: string;
  onRetry: () => void;
  onBack: () => void;
};

export function QueryErrorState({ message, onRetry, onBack }: QueryErrorStateProps) {
  return (
    <GlassCard variant="light" radius={radii.ml} style={styles.card}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.back}
        >
          <LinearGradient
            colors={glass.afterSnapNav.gradient}
            start={glass.afterSnapNav.start}
            end={glass.afterSnapNav.end}
            style={styles.backSurface}
          >
            <Text style={styles.backText}>Back</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch' },
  message: { ...typography.small, color: colors.ink65 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  retry: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: componentSizes.queryErrorActionHeight,
  },
  retryText: { ...typography.nudgeTitle, color: colors.white },
  back: { borderRadius: radii.md, flex: 1, overflow: 'hidden' },
  backSurface: {
    alignItems: 'center',
    borderColor: glass.afterSnapNav.border,
    borderRadius: radii.md,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    minHeight: componentSizes.queryErrorActionHeight,
  },
  backText: { ...typography.linkMd, color: colors.ink70 },
});
