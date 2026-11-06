import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { useSessionStore } from '@/features/auth';
import { usePendingMealCount } from '@/features/nutrition';
import { SignOutSheet } from '@/features/profile/components/SignOutSheet';
import { resolveSignOutSheetState } from '@/features/profile/lib/signOutSheetCopy';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { colors, componentSizes, glass, radii, textStyle } from '@/shared/theme/tokens';

export function SignOutAction() {
  const router = useRouter();
  const pendingMealCount = usePendingMealCount();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [visible, setVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const state = resolveSignOutSheetState({ isOnline, pendingMealCount });

  const confirm = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await useSessionStore.getState().signOut();
      router.replace('/(public)/first-open?signedOut=1' as Href);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => setVisible(true)}
        style={styles.glow}
      >
        <LinearGradient
          colors={glass.accountSignOut.gradient}
          start={glass.accountSignOut.start}
          end={glass.accountSignOut.end}
          style={styles.button}
        >
          <Text style={styles.label}>Sign out</Text>
        </LinearGradient>
      </Pressable>
      <SignOutSheet
        visible={visible}
        state={state}
        signingOut={signingOut}
        onCancel={() => setVisible(false)}
        onConfirm={() => void confirm()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: componentSizes.accountSignOutGlowRadius,
      },
      default: {},
    }),
  } as ViewStyle,
  button: {
    alignItems: 'center',
    borderColor: glass.accountSignOut.border,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    minHeight: componentSizes.accountSignOutHeight,
    shadowColor: glass.accountSignOut.shadowColor,
    shadowOffset: { width: 0, height: componentSizes.accountSignOutShadowOffset },
    shadowOpacity: 1,
    shadowRadius: componentSizes.accountSignOutShadowRadius,
  },
  label: { ...textStyle('buttonSm'), color: colors.ink },
});
