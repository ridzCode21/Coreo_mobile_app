import type { PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '@/shared/components/GlassCard';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type MealSheetSkyFrameProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
}>;

export function MealSheetSkyFrame({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: MealSheetSkyFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SkyBackground variant="sheet" style={StyleSheet.absoluteFill}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
      </SkyBackground>
      <View
        style={[
          styles.sheetWrap,
          { paddingBottom: Math.max(insets.bottom, spacing.screenPadBottom) },
        ]}
        pointerEvents="box-none"
      >
        <GlassCard variant="sheet" padded={false}>
          <View style={styles.content}>
            <View style={styles.grabber} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.ml,
    position: 'absolute',
    right: 0,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.screenPadXCompact,
    paddingTop: spacing.ml,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: withAlpha(colors.ink, 0.18),
    borderRadius: radii.pill,
    height: componentSizes.sheetGrabberHeight,
    width: componentSizes.sheetGrabberWidth,
  },
  title: {
    ...textStyle('cardTitle'),
    color: colors.ink,
    marginTop: spacing.sheetTitleGap,
  },
  subtitle: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink55,
    marginTop: spacing.sheetSubtitleGap,
  },
});
