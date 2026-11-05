import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useProfileQuery, useSessionStore, useUpdateProfileMutation } from '@/features/auth';
import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';
import { AccountIdentitySection } from '@/features/profile/components/AccountIdentitySection';
import { useAccountNameForm } from '@/features/profile/lib/useAccountNameForm';
import { ApiError } from '@/shared/api/errors';
import { BackButton } from '@/shared/components/BackButton';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { colors, componentSizes, spacing, typography } from '@/shared/theme/tokens';

export default function AccountScreen() {
  const router = useRouter();
  const profile = useProfileQuery();
  const updateProfile = useUpdateProfileMutation();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const user = profile.data;
  const nameForm = useAccountNameForm({
    user: user ?? { first_name: '', last_name: '' },
    mutation: updateProfile,
    onDiscardBack: () => router.back(),
  });

  const handleBack = () => {
    if (nameForm.mode === 'editing') {
      nameForm.requestLeave();
      return;
    }
    if (nameForm.mode === 'discarding') return;
    router.back();
  };

  const content = (() => {
    if (profile.isLoading && !user) {
      return (
        <View style={styles.state} testID="account-loading">
          <ActivityIndicator color={colors.ink45} />
        </View>
      );
    }
    if (!user && profile.error instanceof ApiError && profile.error.kind === 'unauthorized') {
      return (
        <View style={styles.state}>
          <Text style={styles.stateMessage}>
            Your session ended. Sign in again to see your account.
          </Text>
          <Pressable
            accessibilityLabel="Sign in again"
            accessibilityRole="button"
            onPress={() => useSessionStore.getState().signOut()}
            style={styles.signIn}
          >
            <Text style={styles.signInText}>Sign in again</Text>
          </Pressable>
        </View>
      );
    }
    if (!user) {
      return (
        <View style={styles.state}>
          <QueryErrorState
            message="Something went wrong loading your account. Your data is safe."
            onBack={() => router.back()}
            onRetry={() => profile.refetch()}
          />
        </View>
      );
    }
    return (
      <>
        <AccountIdentitySection isOnline={isOnline} nameForm={nameForm} user={user} />
        <AccountActionsSection showLabel={false} />
      </>
    );
  })();

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        {user ? (
          <View style={styles.header}>
            <BackButton onPress={handleBack} />
            <Text style={styles.title}>Account</Text>
            <View style={styles.headerSpacer} />
          </View>
        ) : null}
        {content}
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
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: componentSizes.profileKnowledgeMinHeight,
  },
  stateMessage: { ...typography.small, color: colors.ink65, textAlign: 'center' },
  signIn: { marginTop: spacing.md },
  signInText: { ...typography.button, color: colors.ink },
});
