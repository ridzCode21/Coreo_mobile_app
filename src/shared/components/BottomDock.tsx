import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

export type BottomDockRouteName = 'diet' | 'fitness' | 'wellness' | 'coreo';

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
  const stroke = active ? colors.onNight : 'rgba(239,244,249,0.72)';
  if (name === 'diet') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 3v18M14 3h6"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'fitness') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 10v4M8 8v8M16 8v8M20 10v4M8 12h8"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'wellness') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 20c4-2.4 7-6 7-10a7 7 0 0 0-14 0c0 4 3 7.6 7 10Z"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="M9 10.5c1.5 1.4 4.5 1.4 6 0"
          stroke={stroke}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 12c2.3-5.7 5.3-5.7 7.8 0s5.5 5.7 9.2 0"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Circle cx={15.8} cy={14} r={1.8} fill={stroke} opacity={0.9} />
    </Svg>
  );
}

export function BottomDock({ items }: BottomDockProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <GlassCard variant="night" radius={radii.xl} padded={false} style={styles.card}>
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
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 430,
  },
  row: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(8,24,44,0.5)',
  },
  label: {
    ...textStyle('micro'),
    color: 'rgba(239,244,249,0.62)',
  },
  labelActive: {
    color: colors.onNight,
  },
});
