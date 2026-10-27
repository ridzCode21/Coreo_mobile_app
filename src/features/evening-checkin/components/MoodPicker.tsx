import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOOD_EMOJI } from '@/features/evening-checkin/lib/moodEmoji';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
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
            style={[styles.pressable, isSelected && styles.glow]}
          >
            <GlassCard
              variant={isSelected ? 'eveningCheckInMoodSelected' : 'eveningCheckInMood'}
              radius={radii.eveningCheckInMood}
              blurred={false}
              padded={false}
              style={isSelected ? { ...styles.pill, ...styles.selectedShadow } : styles.pill}
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
  row: { flexDirection: 'row', gap: spacing.eveningCheckInMoodGap, marginTop: spacing.lg },
  pressable: { flex: 1, minWidth: 0, borderRadius: radii.eveningCheckInMood },
  glow: {
    elevation: componentSizes.eveningCheckInElevation,
    shadowColor: withAlpha(colors.white, 0.8),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInMoodGlowRadius,
  },
  pill: {
    minHeight: componentSizes.eveningCheckInMoodPillMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.eveningCheckInMoodGap,
    paddingHorizontal: spacing.eveningCheckInMoodPadX,
    paddingVertical: spacing.ms,
  },
  selectedShadow: {
    shadowOffset: { width: 0, height: componentSizes.eveningCheckInMoodShadowOffset },
    shadowRadius: componentSizes.eveningCheckInMoodShadowRadius,
  },
  emoji: { ...textStyle('eveningCheckInMoodEmoji') },
  label: { ...textStyle('eveningCheckInMoodLabel'), color: colors.ink55 },
  labelSelected: { ...textStyle('eveningCheckInMoodLabelSelected'), color: colors.ink },
});
