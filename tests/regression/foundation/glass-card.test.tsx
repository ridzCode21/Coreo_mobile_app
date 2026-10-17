import { StyleSheet, Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '@/shared/components/GlassCard';
import { glass, radii } from '@/shared/theme/tokens';

// Issue #53 — GlassCard is the single place that owns the "liquid glass on sky" recipe
// (docs/design-system.md §4). Each variant's exact gradient stops, border and (where the design
// specifies one) shadow colour must come from the shared `glass` token, not a locally hardcoded
// literal — these tests pin the corrected light/night values and the new chip/sheet variants.
describe('foundation: GlassCard variants (issue #53)', () => {
  function clipViewOf(root: ReturnType<typeof render>) {
    // The clip view is the one with both a borderRadius and a borderColor — it carries the
    // variant's border colour (GlassCard.tsx's `styles.clip`).
    return root.UNSAFE_getAllByType(View).find((node) => {
      const flat = StyleSheet.flatten(node.props.style);
      return flat && typeof flat.borderColor === 'string';
    });
  }

  it('variant="light" uses the corrected border (.55) and shadow (.14), unchanged gradient', () => {
    render(
      <GlassCard variant="light">
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.light.gradient);
    expect(gradient.props.start).toEqual(glass.light.start);
    expect(gradient.props.end).toEqual(glass.light.end);

    const clip = clipViewOf(screen);
    expect(clip).toBeDefined();
    expect(StyleSheet.flatten(clip!.props.style).borderColor).toBe(glass.light.border);

    const blur = screen.UNSAFE_getByType(BlurView);
    expect(blur.props.intensity).toBe(60);
    expect(blur.props.tint).toBe('light');
  });

  it('variant="night" uses the corrected gradient (.6 to .7) and border (.22)', () => {
    render(
      <GlassCard variant="night">
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.night.gradient);
    expect(gradient.props.start).toEqual(glass.night.start);
    expect(gradient.props.end).toEqual(glass.night.end);

    const clip = clipViewOf(screen);
    expect(StyleSheet.flatten(clip!.props.style).borderColor).toBe(glass.night.border);

    const blur = screen.UNSAFE_getByType(BlurView);
    expect(blur.props.intensity).toBe(90);
    expect(blur.props.tint).toBe('dark');
  });

  it('variant="chip" renders the new .5/.14 chip recipe', () => {
    render(
      <GlassCard variant="chip">
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.chip.gradient);
    expect(gradient.props.start).toEqual(glass.chip.start);
    expect(gradient.props.end).toEqual(glass.chip.end);

    const clip = clipViewOf(screen);
    expect(StyleSheet.flatten(clip!.props.style).borderColor).toBe(glass.chip.border);
  });

  // Issue #40 — `glass.chipSelected` (tokens.ts) already matched the design's bright/near-opaque
  // card recipe (`gradient:[white@.94, white@.6], border: white@.9`) but wasn't wired into
  // `GlassCardVariant`/the blur map, so every screen needing a bright card had to misuse the
  // translucent `chip` variant instead. This is the round-4 regression from the discarded fitness
  // attempt (#40 plan.md Decision 7) — pin that `chipSelected` now renders correctly on its own.
  it('variant="chipSelected" renders the bright .94/.6 recipe, distinct from chip', () => {
    render(
      <GlassCard variant="chipSelected">
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.chipSelected.gradient);
    expect(gradient.props.colors).not.toEqual(glass.chip.gradient);
    expect(gradient.props.start).toEqual(glass.chipSelected.start);
    expect(gradient.props.end).toEqual(glass.chipSelected.end);

    const clip = clipViewOf(screen);
    expect(StyleSheet.flatten(clip!.props.style).borderColor).toBe(glass.chipSelected.border);

    const blur = screen.UNSAFE_getByType(BlurView);
    expect(blur.props.intensity).toBe(60);
    expect(blur.props.tint).toBe('light');
  });

  it('variant="sheet" renders the new 160deg .82/.55 recipe at the 36px sheet radius by default', () => {
    render(
      <GlassCard variant="sheet">
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.sheet.gradient);
    expect(gradient.props.start).toEqual(glass.sheet.start);
    expect(gradient.props.end).toEqual(glass.sheet.end);

    const clip = clipViewOf(screen);
    const flat = StyleSheet.flatten(clip!.props.style);
    expect(flat.borderColor).toBe(glass.sheet.border);
    expect(flat.borderRadius).toBe(radii.xxl);

    const blur = screen.UNSAFE_getByType(BlurView);
    expect(blur.props.intensity).toBe(90);
  });

  // Issue #20 — the glass dock (23a) is brighter than the shared `light` recipe and needs its
  // own variant rather than overloading `light`'s gradient/border values.
  it('variant="dock" renders the dock\'s own brighter white recipe (.7/.38, border .75)', () => {
    render(
      <GlassCard variant="dock" radius={radii.xxl}>
        <Text>content</Text>
      </GlassCard>,
    );
    const gradient = screen.UNSAFE_getAllByType(LinearGradient)[0];
    expect(gradient.props.colors).toEqual(glass.dock.gradient);
    expect(gradient.props.start).toEqual(glass.dock.start);
    expect(gradient.props.end).toEqual(glass.dock.end);

    const clip = clipViewOf(screen);
    const flat = StyleSheet.flatten(clip!.props.style);
    expect(flat.borderColor).toBe(glass.dock.border);
    expect(flat.borderRadius).toBe(radii.xxl);

    const blur = screen.UNSAFE_getByType(BlurView);
    expect(blur.props.intensity).toBe(90);
    expect(blur.props.tint).toBe('light');
  });

  // Issue #14 — LabeledField (8e/8b) needs 15/18px field padding instead of the default 20px,
  // without re-implementing the glass recipe. These two props are purely additive: every existing
  // caller that omits them must render exactly as before.
  describe('content padding overrides (issue #14)', () => {
    it('defaults to 20/20px padding when no override is given', () => {
      render(
        <GlassCard>
          <Text>content</Text>
        </GlassCard>,
      );
      const content = screen.getByTestId('glass-card-content');
      const flat = StyleSheet.flatten(content.props.style);
      expect(flat.paddingVertical ?? flat.padding).toBe(20);
      expect(flat.paddingHorizontal ?? flat.padding).toBe(20);
    });

    it('overrides vertical/horizontal padding independently when given', () => {
      render(
        <GlassCard contentPaddingVertical={15} contentPaddingHorizontal={18}>
          <Text>content</Text>
        </GlassCard>,
      );
      const content = screen.getByTestId('glass-card-content');
      const flat = StyleSheet.flatten(content.props.style);
      expect(flat.paddingVertical).toBe(15);
      expect(flat.paddingHorizontal).toBe(18);
    });
  });
});
