import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppConfigQuery } from '@/features/profile/api/appConfigApi';
import { getAppVersionLabel } from '@/features/profile/lib/appVersionLabel';
import { colors, componentSizes, spacing, typography } from '@/shared/theme/tokens';

export function LegalSection() {
  const config = useAppConfigQuery();
  const disabled = config.isLoading || !config.data;
  const version = getAppVersionLabel(Constants.expoConfig ?? {}, Platform.OS);

  const open = (url: string | undefined) => {
    if (!disabled && url) void Linking.openURL(url);
  };

  return (
    <View style={styles.section} testID="account-legal-section">
      <Pressable
        accessibilityLabel="Terms"
        accessibilityRole="link"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => open(config.data?.termsUrl)}
        style={styles.linkTarget}
      >
        <Text style={styles.link}>Terms</Text>
      </Pressable>
      <Text style={styles.separator}>·</Text>
      <Pressable
        accessibilityLabel="Privacy"
        accessibilityRole="link"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => open(config.data?.privacyUrl)}
        style={styles.linkTarget}
      >
        <Text style={styles.link}>Privacy</Text>
      </Pressable>
      {version ? (
        <>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.version} testID="account-version-label">
            {version}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  linkTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  link: { ...typography.legal, color: colors.ink45, textDecorationLine: 'underline' },
  separator: { ...typography.legal, color: colors.ink20 },
  version: { ...typography.legal, color: colors.ink30 },
});
