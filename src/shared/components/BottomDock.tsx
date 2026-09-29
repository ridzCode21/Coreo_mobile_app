import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';

export type BottomDockRouteName = 'diet' | 'fitness' | 'wellness' | 'core';

export type BottomDockItem = {
  name: BottomDockRouteName;
  label: string;
  active: boolean;
  onPress: () => void;
};

type BottomDockProps = {
  items: BottomDockItem[];
};

function DockIcon({ name, active }: { name: BottomDockRouteName; active: boolean }) {
  const stroke = active ? colors.onNight : colors.ink60;
  if (name === 'diet') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 13h10M8.5 13c0 3 7 3 7 0M12 6v5M9.5 8.5v2.5M14.5 8.5v2.5"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'fitness') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 10v4M8 8v8M16 8v8M20 10v4M8 12h8"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'wellness') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18.5 15.4A6.8 6.8 0 0 1 8.6 5.5 7 7 0 1 0 18.5 15.4Z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 12c2.3-5.7 5.3-5.7 7.8 0s5.5 5.7 9.2 0"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {active ? null : <Circle cx={15.8} cy={14} r={1.5} fill={stroke} opacity={0.8} />}
    </Svg>
  );
}

export function BottomDock({ items }: BottomDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
      <GlassCard variant="light" radius={38} padded={false} style={styles.card}>
        <View style={styles.row}>
          {items.map((item) => (
            <Pressable
              key={item.name}
              onPress={item.onPress}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.active }}
              style={styles.item}
            >
              <View style={[styles.iconCircle, item.active && styles.iconCircleActive]}>
                <DockIcon name={item.name} active={item.active} />
              </View>
              <Text style={[styles.label, item.active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 676,
  },
  row: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  item: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.ink,
    shadowColor: 'rgba(8,24,44,0.34)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  label: {
    ...textStyle('caption'),
    color: colors.ink60,
  },
  labelActive: {
    color: colors.ink,
  },
});
