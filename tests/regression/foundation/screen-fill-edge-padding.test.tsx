/**
 * Issue #46 - `Screen` gets opt-in `fill` and `edgePadding` so a screen can pin its last element
 * to the bottom and use the design's fixed top/bottom padding (24a: 64 top, 32 bottom) without
 * stacking on the safe area. Defaults stay as before for every other screen.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

import { Screen } from '@/shared/components/Screen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

function paddings(tree: ReturnType<typeof render>) {
  const scroll = tree.UNSAFE_getByType(ScrollView);
  const centerer = scroll.findAllByType(View)[0];
  // Walk to the first View that carries vertical padding.
  const styled = scroll
    .findAllByType(View)
    .map((view) => StyleSheet.flatten(view.props.style) ?? {})
    .find((style) => 'paddingTop' in style);
  return { top: styled?.paddingTop, bottom: styled?.paddingBottom, centerer };
}

describe('shared: Screen fill and edgePadding (#46)', () => {
  it('keeps the safe-area padding by default', () => {
    const { top, bottom } = paddings(
      render(
        <Screen>
          <Text>x</Text>
        </Screen>,
      ),
    );
    expect(top).toBe(47 + 12);
    expect(bottom).toBe(34 + 12);
  });

  it('uses the given total padding instead of stacking on the safe area', () => {
    const { top, bottom } = paddings(
      render(
        <Screen edgePadding={{ top: 64, bottom: 32 }}>
          <Text>x</Text>
        </Screen>,
      ),
    );
    expect(top).toBe(64);
    expect(bottom).toBe(34); // never less than the home-indicator area
  });

  it('stretches the content only when fill is set', () => {
    const plain = render(
      <Screen>
        <Text>x</Text>
      </Screen>,
    );
    const filled = render(
      <Screen fill>
        <Text>x</Text>
      </Screen>,
    );
    const flexOf = (tree: ReturnType<typeof render>) =>
      tree
        .UNSAFE_getByType(ScrollView)
        .findAllByType(View)
        .map((view) => StyleSheet.flatten(view.props.style)?.flex)
        .filter((flex) => flex === 1).length;
    expect(flexOf(filled)).toBeGreaterThan(flexOf(plain));
  });
});
