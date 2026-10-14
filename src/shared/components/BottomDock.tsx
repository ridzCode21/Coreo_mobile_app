import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

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
  const stroke = active ? colors.onNight : colors.ink62;
  if (name === 'diet') {
    return (
      <Svg
        width={componentSizes.dockIconSize}
        height={componentSizes.dockIconSize}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M4 12h16a8 8 0 0 1-16 0z"
          stroke={stroke}
          strokeWidth={componentSizes.dockIconStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8 12V7M12 12V5M16 12V7"
          stroke={stroke}
          strokeWidth={componentSizes.dockIconStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (name === 'fitness') {
    return (
      <Svg
        width={componentSizes.dockIconSize}
        height={componentSizes.dockIconSize}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"
          stroke={stroke}
          strokeWidth={componentSizes.dockIconStrokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === 'wellness') {
    return (
      <Svg
        width={componentSizes.dockIconSize}
        height={componentSizes.dockIconSize}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M18.5 15.4A6.8 6.8 0 0 1 8.6 5.5 7 7 0 1 0 18.5 15.4Z"
          stroke={stroke}
          strokeWidth={componentSizes.dockIconStrokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg
      width={componentSizes.dockIconSize}
      height={componentSizes.dockIconSize}
      viewBox="0 0 24 24"
      fill="none"
    >
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
      <GlassCard variant="dock" radius={radii.xxl} padded={false} style={styles.card}>
        <View testID="bottom-dock-row" style={styles.row}>
          {items.map((item) => (
            <Pressable
              key={item.name}
              onPress={item.onPress}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.active }}
              style={styles.item}
            >
              <View testID={`dock-item-${item.name}`} style={styles.itemContent}>
                <View
                  testID={`dock-icon-${item.name}`}
                  style={[styles.iconCircle, item.active && styles.iconCircleActive]}
                >
                  <DockIcon name={item.name} active={item.active} />
                </View>
                <Text style={[styles.label, item.active && styles.labelActive]}>{item.label}</Text>
              </View>
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
    height: componentSizes.dockHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  item: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    gap: spacing.dockItemGap,
  },
  iconCircle: {
    width: componentSizes.dockIconCircle,
    height: componentSizes.dockIconCircle,
    borderRadius: componentSizes.dockIconCircle / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.ink,
    shadowColor: colors.dockActiveIconShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  label: {
    ...textStyle('dockLabel'),
    color: colors.ink60,
  },
  labelActive: {
    ...textStyle('dockLabelActive'),
    color: colors.ink,
  },
});
