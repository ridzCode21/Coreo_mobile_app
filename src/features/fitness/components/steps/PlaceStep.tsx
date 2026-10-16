import { StyleSheet, Text, View } from 'react-native';

import { ToggleRow } from '@/shared/components/ToggleRow';
import {
  componentSizes,
  colors,
  radii,
  spacing,
  textStyle,
  typography,
} from '@/shared/theme/tokens';
import { TRAINING_PLACES, type TrainingPlace } from '@/shared/types/fitnessProfile';
import { trainingPlaceLabels } from '@/features/fitness/lib/fitnessChoiceLabels';

type PlaceStepProps = {
  value: TrainingPlace[];
  onChange: (value: TrainingPlace[]) => void;
};

export function PlaceStep({ value, onChange }: PlaceStepProps) {
  const toggle = (place: TrainingPlace) => {
    onChange(value.includes(place) ? value.filter((item) => item !== place) : [...value, place]);
  };

  return (
    <View style={styles.stack}>
      <View style={styles.rows}>
        {TRAINING_PLACES.map((place) => (
          <ToggleRow
            key={place}
            title={trainingPlaceLabels[place]}
            selected={value.includes(place)}
            onPress={() => toggle(place)}
            radius={radii.md}
            minHeight={componentSizes.authButtonHeight}
            titleFontSize={typography.body.fontSize}
          />
        ))}
      </View>
      <Text style={styles.footnote}>Pick more than one if life splits between them.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  rows: { gap: spacing.ms },
  footnote: { ...textStyle('legal'), color: colors.ink50, textAlign: 'center' },
});
