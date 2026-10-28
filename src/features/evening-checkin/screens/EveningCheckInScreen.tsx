import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import type { EveningCheckInMoodKey, EveningCheckInRitual } from '@/shared/types/eveningCheckIn';

const RETRY_MESSAGE = 'Something went wrong. Try again.';
const NOTE_MAX_LENGTH = 500;
const PREVIEW_EYEBROW = 'Tomorrow, previewed';
const CLOSED_ACTION = 'Good night';

const EDGE_PADDING = { top: spacing.screenPadTop, bottom: spacing.eveningCheckInPadBottom };

type PreviewText = { eyebrow?: string; line?: string };

/** The closed card's text: the server's preview, else its message under a default eyebrow, else none. */
function closedPreviewText({ preview, message }: EveningCheckInRitual): PreviewText {
  if (preview) return { eyebrow: preview.eyebrow, line: preview.line };
  if (message) return { eyebrow: PREVIEW_EYEBROW, line: message };
  return {};
}

export default function EveningCheckInScreen() {
  const router = useRouter();
  const query = useEveningCheckInQuery();
  const closeMutation = useCloseEveningCheckInMutation();
  // The design opens with "Good" already picked, so Close the day is always ready.
  const [mood, setMood] = useState<EveningCheckInMoodKey>('good');
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
    const { eyebrow, line } = closedPreviewText(ritual);
    return (
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <Screen background="transparent" fill edgePadding={EDGE_PADDING}>
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
            eyebrow={eyebrow}
            line={line}
            action={ritual.preview?.action ?? CLOSED_ACTION}
            onDismiss={() => router.back()}
          />
        </Screen>
      </View>
    );
  }

  const isClosing = closeMutation.isPending;
  const close = () => {
    if (isClosing) return;
    closeMutation.mutate({ mood, note }, { onSuccess: () => setNote('') });
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Screen
          background="transparent"
          fill
          edgePadding={EDGE_PADDING}
          keyboardShouldPersistTaps="handled"
        >
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
            onChangeText={setNote}
            placeholder={ritual.note_prompt}
            placeholderTextColor={colors.ink45}
            returnKeyType="done"
            style={styles.note}
            value={note}
          />
          <View style={styles.spacer} />
          <View style={styles.closeGlow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ritual.close_label}
              accessibilityState={{ disabled: isClosing }}
              disabled={isClosing}
              onPress={close}
              style={[styles.close, isClosing && styles.closing]}
            >
              <Text style={styles.closeText}>{ritual.close_label}</Text>
            </Pressable>
          </View>
          {closeMutation.isError ? <Text style={styles.error}>{RETRY_MESSAGE}</Text> : null}
        </Screen>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Loading and error: the same sky as the ritual, nothing else, so the screen does not flash. */
function StateScreen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.state}>
        {children}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  state: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  eyebrow: { ...textStyle('wellnessCardLabel'), color: colors.ink45 },
  question: { ...textStyle('eveningCheckInQuestion'), color: colors.ink, marginTop: spacing.ml },
  dimEyebrow: {
    ...textStyle('wellnessCardLabel'),
    color: colors.eveningCheckInDimEyebrow,
    opacity: 0.5,
  },
  // React Native has no blur filter on iOS, so the 1px blur is a 1px glow of the glyph shape.
  dimQuestion: {
    ...textStyle('eveningCheckInQuestion'),
    color: colors.ink,
    marginTop: spacing.ml,
    opacity: 0.35,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: componentSizes.eveningCheckInDimBlur,
  },
  note: {
    ...textStyle('eveningCheckInNotePrompt'),
    backgroundColor: withAlpha(colors.white, 0.36),
    borderColor: withAlpha(colors.white, 0.5),
    borderRadius: radii.eveningCheckInNote,
    borderWidth: componentSizes.hairline,
    color: colors.ink,
    height: componentSizes.eveningCheckInNoteHeight,
    marginTop: spacing.ms,
    paddingHorizontal: spacing.eveningCheckInFieldPadX,
    paddingVertical: 0,
    textAlignVertical: 'center',
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
    elevation: componentSizes.eveningCheckInElevation,
    shadowColor: withAlpha(colors.white, 0.8),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.eveningCheckInCloseGlowRadius,
  },
  closing: { opacity: 0.5 },
  closeText: { ...textStyle('eveningCheckInClose'), color: colors.ink },
  error: { ...textStyle('small'), color: colors.ink65, marginTop: spacing.sm, textAlign: 'center' },
});
