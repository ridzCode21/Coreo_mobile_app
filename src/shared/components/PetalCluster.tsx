import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontFamily, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

export type PetalClusterItem = {
  id: 'diet' | 'fitness' | 'wellness' | 'core';
  label: string;
  subLabel?: string;
  emphasized?: boolean;
  onPress?: () => void;
};

type PetalClusterProps = {
  items: PetalClusterItem[];
};

type PetalSurfaceProps = {
  item: PetalClusterItem;
  index: number;
};

function petalRadius(index: number): ViewStyle {
  const outer = radii.petalOuter;
  const inner = radii.petalInner;
  return {
    borderTopLeftRadius: index === 0 ? outer : inner,
    borderTopRightRadius: index === 1 ? outer : inner,
    borderBottomLeftRadius: index === 2 ? outer : inner,
    borderBottomRightRadius: index === 3 ? outer : inner,
  };
}

export function PetalCluster({ items }: PetalClusterProps) {
  return (
    <View style={styles.halo}>
      <View style={styles.grid}>
        {[0, 2].map((rowStart) => (
          <View key={rowStart} style={styles.row}>
            {items.slice(rowStart, rowStart + 2).map((item, rowIndex) => {
              const index = rowStart + rowIndex;
              const surface = <PetalSurface item={item} index={index} />;

              return item.onPress ? (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [
                    styles.petalWrap,
                    petalRadius(index),
                    pressed && styles.pressed,
                  ]}
                >
                  {surface}
                </Pressable>
              ) : (
                <View key={item.id} style={[styles.petalWrap, petalRadius(index)]}>
                  {surface}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function PetalSurface({ item, index }: PetalSurfaceProps) {
  return (
    <LinearGradient
      // Petals deliberately retain their own softer emphasized/default recipe from the design;
      // it is close to, but distinct from, the shared chip material.
      colors={
        item.emphasized
          ? [withAlpha(colors.white, 0.92), withAlpha(colors.white, 0.46)]
          : [withAlpha(colors.white, 0.54), withAlpha(colors.white, 0.16)]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.petal, petalRadius(index)]}
    >
      <Text style={[styles.label, item.emphasized && styles.emphasizedLabel]}>{item.label}</Text>
      {item.subLabel ? (
        <Text style={[styles.subLabel, item.emphasized && styles.emphasizedSubLabel]}>
          {item.subLabel}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 338,
    aspectRatio: 1,
    borderRadius: 180,
    backgroundColor: withAlpha(colors.white, 0.22),
    padding: spacing.lg,
    shadowColor: withAlpha(colors.white, 0.8),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 34,
  },
  grid: {
    flex: 1,
    gap: spacing.sm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  petalWrap: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.55),
    shadowColor: withAlpha(colors.overlayInk, 0.16),
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 26,
  },
  petal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    ...textStyle('body'),
    color: colors.ink,
    textAlign: 'center',
  },
  subLabel: {
    ...textStyle('petalSubLabel'),
    color: colors.label,
    textAlign: 'center',
    marginTop: spacing.replaceDetailGap,
  },
  emphasizedSubLabel: {
    color: colors.ink50,
  },
  emphasizedLabel: {
    fontFamily: fontFamily.poppins500,
  },
});
