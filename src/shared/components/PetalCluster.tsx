import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

export type PetalClusterItem = {
  id: 'diet' | 'fitness' | 'wellness' | 'coreo';
  label: string;
  value: string;
  active?: boolean;
  onPress: () => void;
};

type PetalClusterProps = {
  items: PetalClusterItem[];
};

function petalRadius(index: number) {
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
              return (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  style={({ pressed }) => [
                    styles.petalWrap,
                    petalRadius(index),
                    pressed && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={
                      item.active
                        ? ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.46)']
                        : ['rgba(255,255,255,0.54)', 'rgba(255,255,255,0.16)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.petal, petalRadius(index)]}
                  >
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.value}>{item.value}</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 338,
    aspectRatio: 1,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: spacing.lg,
    shadowColor: 'rgba(255,255,255,0.8)',
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
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: 'rgba(18,42,70,0.16)',
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
  value: {
    ...textStyle('micro'),
    color: colors.ink45,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
