import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors, componentSizes, glass, radii, spacing, textStyle } from '@/shared/theme/tokens';

type Props = {
  firstName?: string | null;
};

export function ProfileCircle({ firstName }: Props) {
  const router = useRouter();
  const initial = firstName?.trim().slice(0, 1).toUpperCase();

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      hitSlop={spacing.xs}
    >
      <LinearGradient
        colors={glass.profileAvatar.gradient}
        start={glass.profileAvatar.start}
        end={glass.profileAvatar.end}
        style={styles.circle}
      >
        {initial ? <Text style={styles.initial}>{initial}</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: componentSizes.profileCircle,
    height: componentSizes.profileCircle,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.profileAvatar.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: glass.profileAvatar.shadowColor,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.profileCircleShadowRadius,
  },
  initial: { ...textStyle('profileCircleInitial'), color: colors.onNight },
});
