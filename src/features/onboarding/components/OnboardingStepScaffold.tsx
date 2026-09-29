import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, spacing, textStyle } from '@/shared/theme/tokens';
import { WaveMark } from '@/shared/components/WaveMark';
import { ProgressDots } from '@/shared/components/ProgressDots';

type OnboardingStepScaffoldProps = PropsWithChildren<{
  /** Explicit per-flow progress dots (`{ index, total }`) — each onboarding flow (core setup,
   * diet interview, …) owns its own track and total, rather than the scaffold reading one global
   * constant (design-system.md §7 changelog). `null`/omitted renders no dot rail (e.g. 8a Save,
   * which the design shows without one). Build with `flowStepProgress` (`lib/steps.ts`), not by
   * hand. */
  progress?: { index: number; total: number } | null;
  /** The big display question — pass a `<Text>` tree so callers can mix weights for emphasis
   * (e.g. `<Text style={emphasis}>want to fix.</Text>`), matching the design's inline-emphasis
   * question headlines. */
  title: ReactNode;
  subtitle?: string;
  /** `NextBar` or `VoiceInputBar` — every step renders exactly one footer. */
  footer: ReactNode;
  /** A few steps (12a/16a/17a-style narrower layouts) use 22px horizontal padding instead of the
   * default 26px — see docs/design-system.md §3. Not used by the core-setup steps built so far. */
  compactPaddingX?: boolean;
}>;

/**
 * Shared chrome for every onboarding step screen (7a·1–7a·7 core setup, and later the diet/
 * fitness/wellness pillar interviews) — sky gradient, progress dots, question header with the
 * wave glyph, a flexible body slot, and a footer slot. See docs/design-system.md §7 and
 * implementation-plan.md §5. Scrollable by default per design-system.md §11.3 (short/landscape
 * viewports must never clip).
 *
 * Layout: progress dots + the question header (wave glyph, title, subtitle) stay pinned near the
 * *top*, right under the dots — matching the design reference exactly (title sits high, options/
 * input sit low, with a large empty gap between them, not the two clustered together). A single
 * flexible spacer sits *between* the header and the body, absorbing the slack so the body+footer
 * (the actual answer — chips, sliders, free text) anchor towards the bottom of the screen instead.
 * An earlier version put that spacer *above* the header instead, which dragged the question title
 * itself down to sit right on top of its answer — visibly wrong against the design, which keeps
 * the two far apart. The spacer shrinks toward 0 (then the ScrollView takes over) on tall content,
 * so nothing ever clips.
 */
export function OnboardingStepScaffold({
  progress = null,
  title,
  subtitle,
  footer,
  compactPaddingX,
  children,
}: OnboardingStepScaffoldProps) {
  const insets = useSafeAreaInsets();
  const paddingX = compactPaddingX ? spacing.screenPadXCompact : spacing.screenPadX;

  return (
    <LinearGradient
      colors={[colors.day, colors.air, colors.sky]}
      locations={[0, 0.48, 1]}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.fill}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: paddingX,
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        {progress !== null ? (
          <ProgressDots count={progress.total} activeIndex={progress.index} style={styles.dots} />
        ) : null}

        <View style={styles.header}>
          <WaveMark size={26} strokeWidth={5} style={styles.waveGlyph} />
          <View style={styles.titleBlock}>{title}</View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.spacer} />

        <View style={styles.body}>{children}</View>

        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </LinearGradient>
  );
}

/**
 * Shared question-title styles — base is `questionTitle` (weight 200), `emphasis` bumps just the
 * `fontFamily` to weight 400 for the inline-emphasized clause the design uses on most step
 * headlines (e.g. "tell me what you **want to fix.**"). Nested `<Text>` inherits the parent's
 * `fontSize`/`letterSpacing`, so `emphasis` only needs to override the weight.
 */
export const onboardingTitleStyles = StyleSheet.create({
  base: {
    ...textStyle('questionTitle'),
    color: colors.ink,
  },
  /** The diet-interview screens (12a·1–12a·6, plus the added cuisine/activity/budget/health
   * screens) use a smaller, tighter title than core-setup's `questionTitle` — 25px/line-height
   * 1.5 vs. core-setup's 30px/1.4 in the design source. No named typography token covers this
   * exact combo, so it's expressed as an override here rather than a new global token. */
  compact: {
    ...textStyle('questionTitle'),
    color: colors.ink,
    fontSize: 25,
    lineHeight: 25 * 1.5,
  },
  emphasis: {
    fontFamily: fontFamily.poppins400,
  },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  dots: {
    alignSelf: 'center',
  },
  /** Absorbs the slack between the (top-anchored) header and the (bottom-anchored) body+footer.
   * `minHeight` keeps a little breathing room above the body even when content is tall enough
   * that `flex: 1` collapses to ~0. */
  spacer: {
    flex: 1,
    minHeight: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
  },
  waveGlyph: {
    opacity: 0.55,
  },
  titleBlock: {
    marginTop: spacing.lg,
  },
  subtitle: {
    ...textStyle('bodyLg'),
    marginTop: spacing.md,
    color: 'rgba(23,25,29,0.6)',
  },
  body: {},
  footer: {
    marginTop: spacing.xl,
  },
});
