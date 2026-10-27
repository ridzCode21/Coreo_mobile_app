import type { PropsWithChildren, ReactElement } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from 'react-native';
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
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Stretch the content to the full screen height so children can pin to the bottom (e.g. with
   * `marginTop: 'auto'` or a `flex: 1` spacer). Off by default: content hugs the top. */
  fill?: boolean;
  /** Replaces the default safe-area padding with a total distance from the screen edges (never
   * less than the safe area), for screens designed with fixed top/bottom padding. */
  edgePadding?: { top: number; bottom: number };
  /** Lets a first tap reach a button while the keyboard is open instead of only closing it. */
  keyboardShouldPersistTaps?: 'never' | 'always' | 'handled';
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
  refreshControl,
  fill = false,
  edgePadding,
  keyboardShouldPersistTaps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, breakpoint } = useResponsive();

  const paddingX = breakpoint === 'compact' ? spacing.screenPadXCompact : spacing.screenPadX;

  const paddingTop = edgePadding ? Math.max(edgePadding.top, insets.top) : insets.top + spacing.md;
  const paddingBottom = edgePadding
    ? Math.max(edgePadding.bottom, insets.bottom)
    : insets.bottom + spacing.md;

  const content = (
    <View style={[styles.centerer, { paddingTop, paddingBottom }]}>
      <View
        style={[
          { width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: paddingX },
          fill && styles.flex,
        ]}
      >
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
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
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
