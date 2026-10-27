import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { MoodPicker } from '@/features/evening-checkin/components/MoodPicker';
import { RecapCard } from '@/features/evening-checkin/components/RecapCard';
import { TomorrowPreviewCard } from '@/features/evening-checkin/components/TomorrowPreviewCard';
import {
  useCloseEveningCheckInMutation,
  useEveningCheckInQuery,
} from '@/features/evening-checkin/api/eveningCheckInApi';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { EveningCheckInMoodKey } from '@/shared/types/eveningCheckIn';

const RETRY_MESSAGE = 'Something went wrong. Try again.';
const NOTE_MAX_LENGTH = 500;

export default function EveningCheckInScreen() {
  const router = useRouter();
  const query = useEveningCheckInQuery();
  const closeMutation = useCloseEveningCheckInMutation();
  const [mood, setMood] = useState<EveningCheckInMoodKey | null>(null);
  const [note, setNote] = useState('');

  if (query.isError) {
    return (
      <StateScreen>
        <Text style={styles.error}>{RETRY_MESSAGE}</Text>
      </StateScreen>
    );
  }
  if (!query.data) {
    return (
      <StateScreen>
        <ActivityIndicator color={colors.ink} />
      </StateScreen>
    );
  }

  const ritual = query.data;
  if (ritual.closed) {
    return (
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <Screen background="transparent" contentContainerStyle={styles.screen}>
          <Text
            style={styles.dimEyebrow}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {ritual.eyebrow}
          </Text>
          <Text
            style={styles.dimQuestion}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {ritual.question}
          </Text>
          <TomorrowPreviewCard
            eyebrow={ritual.preview?.eyebrow ?? 'Tomorrow, previewed'}
            line={ritual.preview?.line ?? ritual.message ?? ''}
            action={ritual.preview?.action ?? 'Good night'}
            onDismiss={() => router.back()}
          />
        </Screen>
      </View>
    );
  }

  const canClose = mood !== null && !closeMutation.isPending;
  const close = () => {
    if (!mood || closeMutation.isPending) return;
    closeMutation.mutate({ mood, note }, { onSuccess: () => setNote('') });
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screen}>
        <Text style={styles.eyebrow}>{ritual.eyebrow}</Text>
        <Text style={styles.question}>{ritual.question}</Text>
        <MoodPicker moods={ritual.moods} selected={mood} onSelect={setMood} />
        <RecapCard
          label={ritual.looks_right_label}
          fixLabel={ritual.fix_label}
          lines={ritual.recap}
          onFix={() => router.back()}
        />
        <TextInput
          accessibilityLabel={ritual.note_prompt}
          maxLength={NOTE_MAX_LENGTH}
          multiline
          onChangeText={setNote}
          placeholder={ritual.note_prompt}
          placeholderTextColor={colors.ink45}
          style={styles.note}
          value={note}
        />
        <View style={styles.spacer} />
        <View style={styles.closeGlow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ritual.close_label}
            accessibilityState={{ disabled: !canClose }}
            disabled={!canClose}
            onPress={close}
            style={[styles.close, !canClose && styles.closeDisabled]}
          >
            <Text style={styles.closeText}>{ritual.close_label}</Text>
          </Pressable>
        </View>
        {closeMutation.isError ? <Text style={styles.error}>{RETRY_MESSAGE}</Text> : null}
      </Screen>
    </View>
  );
}

function StateScreen({ children }: { children: ReactNode }) {
  return <Screen contentContainerStyle={styles.state}>{children}</Screen>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flexGrow: 1, paddingTop: spacing.screenPadTop, paddingBottom: spacing.screenPadBottom },
  state: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  eyebrow: { ...textStyle('wellnessCardLabel'), color: colors.ink45 },
  question: { ...textStyle('eveningCheckInQuestion'), color: colors.ink, marginTop: spacing.ml },
  dimEyebrow: { ...textStyle('wellnessCardLabel'), color: colors.ink40, opacity: 0.5 },
  dimQuestion: {
    ...textStyle('eveningCheckInQuestion'),
    color: colors.ink,
    marginTop: spacing.ml,
    opacity: 0.35,
  },
  note: {
    ...textStyle('eveningCheckInNotePrompt'),
    backgroundColor: withAlpha(colors.white, 0.36),
    borderColor: withAlpha(colors.white, 0.5),
    borderRadius: radii.eveningCheckInNote,
    borderWidth: componentSizes.hairline,
    color: colors.ink,
    marginTop: spacing.ms,
    minHeight: componentSizes.eveningCheckInNoteHeight,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  spacer: { flex: 1, minHeight: spacing.xxl },
  close: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.eveningCheckInClose,
    height: componentSizes.eveningCheckInCloseHeight,
    justifyContent: 'center',
    shadowColor: withAlpha(colors.overlayInk, 0.2),
    shadowOffset: { width: 0, height: componentSizes.eveningCheckInCloseShadowOffset },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInCloseShadowRadius,
  },
  closeGlow: {
    borderRadius: radii.eveningCheckInClose,
    elevation: componentSizes.dietElevation,
    shadowColor: withAlpha(colors.white, 0.8),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInCloseGlowRadius,
  },
  closeDisabled: { opacity: 0.5 },
  closeText: { ...textStyle('eveningCheckInClose'), color: colors.ink },
  error: { ...textStyle('small'), color: colors.ink65, marginTop: spacing.sm, textAlign: 'center' },
});
