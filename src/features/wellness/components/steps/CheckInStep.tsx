import { StyleSheet, Text, View } from 'react-native';

import { checkInStyleLabels } from '@/features/wellness/lib/wellnessChoiceLabels';
import { ToggleRow } from '@/shared/components/ToggleRow';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  typography,
} from '@/shared/theme/tokens';
import { CHECK_IN_STYLE, type CheckInStyle } from '@/shared/types/wellnessProfile';

const CHECK_IN_SUBTITLES: Record<CheckInStyle, string> = {
  step_in: 'A gentle nudge when I see the signs',
  only_when_i_come: 'No unprompted check-ins',
};

type CheckInStepProps = {
  checkInStyle: CheckInStyle | '';
  hideNumbers: boolean;
  onCheckInStyleChange: (value: CheckInStyle) => void;
  onHideNumbersChange: (value: boolean) => void;
};

export function CheckInStep({
  checkInStyle,
  hideNumbers,
  onCheckInStyleChange,
  onHideNumbersChange,
}: CheckInStepProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.rows}>
        {CHECK_IN_STYLE.map((choice) => (
          <ToggleRow
            key={choice}
            title={checkInStyleLabels[choice]}
            subtitle={CHECK_IN_SUBTITLES[choice]}
            selected={checkInStyle === choice}
            onPress={() => onCheckInStyleChange(choice)}
            selectionMode="radio"
            radius={radii.md}
            minHeight={componentSizes.authButtonHeight}
            titleFontSize={typography.body.fontSize}
          />
        ))}
        <ToggleRow
          title="Spare me the numbers"
          subtitle="Plain words, no scores or graphs"
          selected={hideNumbers}
          onPress={() => onHideNumbersChange(!hideNumbers)}
          radius={radii.md}
          minHeight={componentSizes.authButtonHeight}
          titleFontSize={typography.body.fontSize}
        />
      </View>
      <Text style={styles.footnote}>Change your mind anytime. Just tell me.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  rows: { gap: spacing.ms },
  footnote: { ...textStyle('legal'), color: colors.ink50, textAlign: 'center' },
});
