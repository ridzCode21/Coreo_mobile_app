import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/shared/theme/tokens';
import { useResponsive } from '@/shared/hooks/useResponsive';

type ScreenProps = PropsWithChildren<{
  /** Most screens should scroll by default — see docs/design-system.md §11.3. Only opt out for
   * screens with their own internal scroll handling (e.g. a chat transcript). */
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  background?: string;
}>;

/**
 * Base screen wrapper: safe-area padding, standard horizontal padding, scrollable by default,
 * and content width capped/centered on tablet. Screens should use this instead of hand-rolling
 * SafeAreaView + padding each time.
 */
export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  background = colors.zenith,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, breakpoint } = useResponsive();

  const paddingX = breakpoint === 'compact' ? spacing.screenPadXCompact : spacing.screenPadX;

  const content = (
    <View
      style={[
        styles.centerer,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      <View style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: paddingX }}>
        {children}
      </View>
    </View>
  );

  if (!scroll) {
    return <View style={[styles.flex, { backgroundColor: background }, style]}>{content}</View>;
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: background }, style]}
      contentContainerStyle={[styles.grow, contentContainerStyle]}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  centerer: { flex: 1, alignItems: 'center', width: '100%' },
});
