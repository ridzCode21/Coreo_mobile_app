import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MealSheetSkyFrame } from '@/shared/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/shared/components/MealSheetSubmitButton';
import { signOutSheetCopy, type SignOutSheetState } from '@/features/profile/lib/signOutSheetCopy';
import { colors, componentSizes, glass, radii, textStyle } from '@/shared/theme/tokens';

type SignOutSheetProps = {
  visible: boolean;
  state: SignOutSheetState;
  signingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SignOutSheet({
  visible,
  state,
  signingOut,
  onCancel,
  onConfirm,
}: SignOutSheetProps) {
  const copy = signOutSheetCopy(state);
  return (
    <MealSheetSkyFrame
      visible={visible}
      title={copy.title}
      titleStyle={state.kind === 'default' ? undefined : textStyle('signOutSheetEyebrow')}
      subtitle={copy.body}
      onClose={onCancel}
    >
      <MealSheetSubmitButton label={copy.primaryLabel} busy={signingOut} onPress={onConfirm} />
      <LinearGradient
        colors={glass.signOutSheetSecondary.gradient}
        start={glass.signOutSheetSecondary.start}
        end={glass.signOutSheetSecondary.end}
        style={[styles.secondary, signingOut && styles.disabled]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.secondaryLabel}
          accessibilityState={{ disabled: signingOut }}
          disabled={signingOut}
          onPress={onCancel}
          style={styles.secondaryPressable}
        >
          <Text style={styles.secondaryText}>{copy.secondaryLabel}</Text>
        </Pressable>
      </LinearGradient>
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  secondary: {
    alignItems: 'center',
    borderColor: glass.signOutSheetSecondary.border,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    marginTop: componentSizes.hairline,
    minHeight: componentSizes.sheetControlHeight,
    overflow: 'hidden',
  },
  secondaryPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.sheetControlHeight,
  },
  secondaryText: { ...textStyle('buttonSm'), color: colors.ink },
  disabled: { opacity: 0.46 },
});
