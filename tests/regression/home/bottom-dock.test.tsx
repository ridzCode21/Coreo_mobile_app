/**
 * Issue #20 — the glass dock (23a, design lines 772-844) has the right items and taps already,
 * but its sizes/radius/icons/labels were bigger than the design: 72px height (was ~88+), 36px
 * radius (was 38), 36px icon circle (was 44), 17px icons (was 24/25), 8.5px labels (was 11.5),
 * and the active label must differ by *weight* (500 vs 400), not only colour. The dock's glass
 * is also its own brighter recipe (`glass.dock`, see foundation/theme-tokens.test.ts), and the
 * Diet/Fitness icon artwork must match the design's exact SVG paths.
 *
 * `testID="bottom-dock-row"` (the 72px row), `testID="dock-item-<name>"` (each icon/label
 * column), and `testID="dock-icon-<name>"` (each icon circle) are additive test hooks this issue
 * adds to `BottomDock.tsx` — querying by them avoids reaching into the render tree by structural
 * position.
 */

import { StyleSheet, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Path, Svg } from 'react-native-svg';

import { BottomDock, type BottomDockItem } from '@/shared/components/BottomDock';
import { colors, componentSizes, glass, radii, spacing, textStyle } from '@/shared/theme/tokens';

function makeItems(activeName: BottomDockItem['name'] = 'core') {
  const onPress = {
    diet: jest.fn(),
    fitness: jest.fn(),
    wellness: jest.fn(),
    core: jest.fn(),
  };
  const items: BottomDockItem[] = [
    { name: 'diet', label: 'Diet', active: activeName === 'diet', onPress: onPress.diet },
    {
      name: 'fitness',
      label: 'Fitness',
      active: activeName === 'fitness',
      onPress: onPress.fitness,
    },
    {
      name: 'wellness',
      label: 'Wellness',
      active: activeName === 'wellness',
      onPress: onPress.wellness,
    },
    { name: 'core', label: 'Coreo', active: activeName === 'core', onPress: onPress.core },
  ];
  return { items, onPress };
}

/** Finds the glass clip View (the one carrying the dock's border colour) — same technique as
 * `foundation/glass-card.test.tsx`'s `clipViewOf`. */
function dockClipView() {
  return screen.UNSAFE_getAllByType(View).find((node) => {
    const flat = StyleSheet.flatten(node.props.style);
    return flat?.borderColor === glass.dock.border;
  });
}

describe('shared: BottomDock matches the design sizes and labels (issue #20)', () => {
  it('renders all four items in the design order with their exact labels', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    expect(screen.getAllByRole('tab').map((n) => n.props.accessibilityLabel)).toEqual([
      'Diet',
      'Fitness',
      'Wellness',
      'Coreo',
    ]);
  });

  it('uses the 72px dock height (not the old ~88px minHeight)', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const row = screen.getByTestId('bottom-dock-row');
    const flat = StyleSheet.flatten(row.props.style);
    expect(flat.height).toBe(componentSizes.dockHeight);
    expect(flat.minHeight).toBeUndefined();
  });

  it('uses the dock glass recipe at 36px radius (not the old 38px)', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const clip = dockClipView();
    expect(clip).toBeDefined();
    expect(StyleSheet.flatten(clip!.props.style).borderRadius).toBe(radii.xxl);
  });

  it('sizes icon circles at 36px (not the old 44px)', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const circle = screen.getByTestId('dock-icon-diet');
    const flat = StyleSheet.flatten(circle.props.style);
    expect(flat.width).toBe(componentSizes.dockIconCircle);
    expect(flat.height).toBe(componentSizes.dockIconCircle);
    expect(flat.borderRadius).toBe(componentSizes.dockIconCircle / 2);
  });

  it('sizes every icon at 17px (not the old 24/25px)', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const svgs = screen.UNSAFE_getAllByType(Svg);
    expect(svgs).toHaveLength(4);
    svgs.forEach((svg) => {
      expect(svg.props.width).toBe(componentSizes.dockIconSize);
      expect(svg.props.height).toBe(componentSizes.dockIconSize);
    });
  });

  it("matches the design's exact Diet icon paths (bowl + 3 prongs)", () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const paths = screen.UNSAFE_getAllByType(Path).map((p) => p.props.d);
    expect(paths).toContain('M4 12h16a8 8 0 0 1-16 0z');
    expect(paths).toContain('M8 12V7M12 12V5M16 12V7');
  });

  it("matches the design's exact Fitness icon path (barbell)", () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const paths = screen.UNSAFE_getAllByType(Path).map((p) => p.props.d);
    expect(paths).toContain('M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12');
  });

  it('gives the active label more weight than the inactive labels, not only a colour change', () => {
    const { items } = makeItems('core');
    render(<BottomDock items={items} />);

    const inactiveLabel = screen.getByText('Diet');
    const activeLabel = screen.getByText('Coreo');

    const inactiveFlat = StyleSheet.flatten(inactiveLabel.props.style);
    const activeFlat = StyleSheet.flatten(activeLabel.props.style);

    expect(inactiveFlat.fontSize).toBe(8.5);
    expect(activeFlat.fontSize).toBe(8.5);
    // Poppins fonts are selected via fontFamily (RN ignores `fontWeight` once a specific-weight
    // font file is set — tokens.ts `textStyle()`), so the weight difference shows up there.
    expect(activeFlat.fontFamily).not.toBe(inactiveFlat.fontFamily);
    expect(activeFlat.fontFamily).toBe(textStyle('dockLabelActive').fontFamily);
    expect(inactiveFlat.fontFamily).toBe(textStyle('dockLabel').fontFamily);

    expect(inactiveFlat.color).toBe(colors.ink60);
    expect(activeFlat.color).toBe(colors.ink);
  });

  it('keeps the 3px gap between an icon and its label', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);

    const column = screen.getByTestId('dock-item-diet');
    const circle = screen.getByTestId('dock-icon-diet');
    const columnStyle = StyleSheet.flatten(column.props.style);
    const circleStyle = StyleSheet.flatten(circle.props.style);

    expect(columnStyle.gap).toBe(spacing.dockItemGap);
    expect(circleStyle.gap).toBeUndefined();
  });

  it('applies the icon-to-label gap to the two-child item column', () => {
    const { items } = makeItems();
    render(<BottomDock items={items} />);
    const column = screen.getByTestId('dock-item-diet');
    const flat = StyleSheet.flatten(column.props.style);

    expect(column.children).toHaveLength(2);
    expect(flat.gap).toBe(spacing.dockItemGap);
  });

  it('still calls the right handler and reports the right accessibility state on tap', () => {
    const { items, onPress } = makeItems('core');
    render(<BottomDock items={items} />);

    fireEvent.press(screen.getByText('Fitness'));
    expect(onPress.fitness).toHaveBeenCalledTimes(1);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });
});
