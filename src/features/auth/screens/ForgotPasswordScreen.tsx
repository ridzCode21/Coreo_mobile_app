import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Password reset</Text>
        <Text style={styles.title}>Not available yet.</Text>
        <GlassCard variant="light" radius={radii.xl}>
          <Text style={styles.body}>
            Password reset is not available in the app yet. You can return to sign in.
          </Text>
        </GlassCard>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="link"
          accessibilityLabel="Back to sign in"
          style={styles.link}
        >
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...textStyle('pageTitle'), color: colors.ink, marginBottom: spacing.xxl },
  body: { ...textStyle('body'), color: colors.ink62 },
  link: {
    minHeight: componentSizes.authButtonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  linkText: {
    ...textStyle('linkMd'),
    color: colors.ink55,
    textDecorationLine: 'underline',
  },
});
