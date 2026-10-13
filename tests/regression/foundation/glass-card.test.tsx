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
});
