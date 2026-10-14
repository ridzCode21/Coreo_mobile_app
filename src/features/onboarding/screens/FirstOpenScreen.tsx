import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { WaveMark } from '@/shared/components/WaveMark';
import { useOrientationLock } from '@/shared/hooks/useOrientationLock';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';

/**
 * First-open (20a/24a) — the landing moment for a brand-new user, straight after the splash.
 * Portrait-locked intentionally (design-system.md §11.3 allows this for a short, single-decision
 * screen). "Meet your core" enters onboarding; returning users can go directly to sign in.
 */
export default function FirstOpenScreen() {
  const router = useRouter();
  const markFirstOpenSeen = useAppFlagsStore((state) => state.markFirstOpenSeen);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const insets = useSafeAreaInsets();

  useOrientationLock('portrait');

  const handleBegin = useCallback(async () => {
    await markFirstOpenSeen();
    resetOnboarding();
    router.replace('/(public)/onboarding/name');
  }, [markFirstOpenSeen, resetOnboarding, router]);

  const handleSignIn = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  return (
    <SkyBackground style={styles.fill}>
      <View
        style={[
          styles.content,
          // Safe-area insets are additive to the screen-padding tokens, not a replacement for
          // them — docs/design-system.md §3.
          {
            paddingTop: insets.top + spacing.screenPadTop,
            paddingBottom: insets.bottom + spacing.screenPadBottom,
          },
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.logoArea}>
            <View testID="first-open-logo-glow" style={styles.logoGlow}>
              <WaveMark size={74} color={colors.ink} strokeWidth={12} />
            </View>
          </View>
          <Text style={styles.wordmark}>coreo</Text>
          <Text style={styles.tagline}>A health app with a core.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleBegin}
            accessibilityRole="button"
            accessibilityLabel="Meet your core"
            style={styles.ctaPressable}
          >
            <GlassCard radius={radii.pill} padded={false}>
              <View testID="first-open-cta-row" style={styles.ctaRow}>
                <Text style={styles.ctaText}>Meet your core</Text>
                <LinearGradient
                  testID="first-open-cta-icon"
                  colors={[colors.coreBlue, colors.coreBlueDeep]}
                  style={styles.ctaIcon}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke={colors.white}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </LinearGradient>
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={handleSignIn}
            accessibilityRole="link"
            accessibilityLabel="I already have an account"
            hitSlop={spacing.lg}
            style={styles.accountLink}
          >
            <Text style={styles.accountLinkText}>I already have an account</Text>
          </Pressable>
          <Text style={styles.returningCaption}>
            Returning account? Sign in at 8b and skip the interview.
          </Text>
        </View>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadX,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
      },
      default: {},
    }),
  } as ViewStyle,
  wordmark: {
    ...textStyle('wordmark'),
    color: colors.ink,
    marginTop: spacing.md,
  },
  tagline: {
    ...textStyle('body'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.ms,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  ctaPressable: {
    width: '100%',
  },
  ctaRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  ctaText: {
    ...textStyle('buttonSm'),
    color: colors.ink,
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLink: {
    marginTop: spacing.lg,
  },
  accountLinkText: {
    ...textStyle('linkSm'),
    color: colors.ink55,
    textDecorationLine: 'underline',
  },
  returningCaption: {
    ...textStyle('fine'),
    color: colors.ink40,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
