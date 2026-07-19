import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, spacing, textStyle } from '@/shared/theme/tokens';
import { WaveMark } from '@/shared/components/WaveMark';
import { ProgressDots } from '@/shared/components/ProgressDots';
import {
  ONBOARDING_PROGRESS_TOTAL,
  onboardingProgressIndex,
  type OnboardingStepId,
} from '@/features/onboarding/lib/steps';

type OnboardingStepScaffoldProps = PropsWithChildren<{
  step: OnboardingStepId;
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
 * viewports must never clip) — the `flexGrow`+`space-between` combo keeps the header-top/
 * footer-bottom look on tall viewports while still allowing real scrolling on short ones.
 */
export function OnboardingStepScaffold({
  step,
  title,
  subtitle,
  footer,
  compactPaddingX,
  children,
}: OnboardingStepScaffoldProps) {
  const insets = useSafeAreaInsets();
  const progressIndex = onboardingProgressIndex(step);
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
        <View>
          {progressIndex !== null ? (
            <ProgressDots
              count={ONBOARDING_PROGRESS_TOTAL}
              activeIndex={progressIndex}
              style={styles.dots}
            />
          ) : null}

          <View style={styles.header}>
            <WaveMark size={26} strokeWidth={5} style={styles.waveGlyph} />
            <View style={styles.titleBlock}>{title}</View>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.body}>{children}</View>
        </View>

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
  emphasis: {
    fontFamily: fontFamily.poppins400,
  },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  dots: {
    alignSelf: 'center',
  },
  header: {
    marginTop: 30,
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
  body: {
    marginTop: spacing.xxl,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
