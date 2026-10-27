import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOOD_EMOJI } from '@/features/evening-checkin/lib/moodEmoji';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type {
  EveningCheckInMoodKey,
  EveningCheckInMoodOption,
} from '@/shared/types/eveningCheckIn';

type Props = {
  moods: EveningCheckInMoodOption[];
  selected: EveningCheckInMoodKey | null;
  onSelect: (mood: EveningCheckInMoodKey) => void;
};

export function MoodPicker({ moods, selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {moods.map((mood) => {
        const isSelected = selected === mood.key;
        return (
          <Pressable
            key={mood.key}
            accessibilityRole="button"
            accessibilityLabel={mood.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(mood.key)}
            style={styles.pressable}
          >
            <GlassCard
              variant={isSelected ? 'chipSelected' : 'chip'}
              radius={radii.eveningCheckInMood}
              padded={false}
              style={styles.pill}
            >
              <Text style={styles.emoji}>{MOOD_EMOJI[mood.key]}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{mood.label}</Text>
            </GlassCard>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sliderCaptionGap, marginTop: spacing.lg },
  pressable: { flex: 1, minWidth: 0 },
  pill: {
    minHeight: componentSizes.eveningCheckInMoodPillMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sliderCaptionGap,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.ms,
  },
  emoji: { ...textStyle('eveningCheckInMoodEmoji') },
  label: { ...textStyle('eveningCheckInMoodLabel'), color: colors.ink55 },
  labelSelected: { ...textStyle('eveningCheckInMoodLabelSelected'), color: colors.ink },
});
