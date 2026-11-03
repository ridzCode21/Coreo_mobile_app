import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';
import { BackButton } from '@/shared/components/BackButton';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, spacing, typography } from '@/shared/theme/tokens';

export default function AccountScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>
        <AccountActionsSection showLabel={false} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  title: { ...typography.cardTitle, color: colors.ink },
});
