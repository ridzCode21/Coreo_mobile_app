import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

type LoggingOptionTileProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
  /** The one highlighted tile per sheet (design 14b: "Snap the plate" is the dark, primary tile). */
  emphasized?: boolean;
  disabled?: boolean;
};

/**
 * One logging-path tile in the "What are we logging?" sheet (14b). Light glass by default; the
 * `emphasized` tile uses the night-glass treatment as the sheet's visual anchor (matching the
 * design's dark "Snap the plate" card). `disabled` dims + blocks the tile for graceful capability
 * fallbacks (e.g. no camera) — no path is disabled by default now that photo/barcode are in scope.
 */
export function LoggingOptionTile({
  title,
  subtitle,
  icon,
  onPress,
  emphasized = false,
  disabled = false,
}: LoggingOptionTileProps) {
  const textColor = emphasized ? colors.onNight : colors.ink;
  const subColor = emphasized ? 'rgba(239,244,249,0.62)' : colors.ink45;

  const inner = (
    <View style={styles.inner}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>
      </View>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled }}
      style={[styles.pressable, disabled && styles.disabled]}
    >
      {emphasized ? (
        <LinearGradient
          colors={['rgba(34,66,102,0.85)', 'rgba(12,28,48,0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tile, styles.emphasized]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.28)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tile, styles.light]}
        >
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  tile: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  light: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  emphasized: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconWrap: {
    height: 28,
    justifyContent: 'center',
  },
  textWrap: {
    gap: 2,
  },
  title: {
    ...textStyle('bodyLg'),
  },
  subtitle: {
    ...textStyle('caption'),
  },
});
