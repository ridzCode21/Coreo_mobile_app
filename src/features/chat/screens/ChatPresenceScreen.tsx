import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  useConfirmChatMutation,
  useProposeChatMutation,
  useUndoChatMutation,
} from '@/features/chat/api/chatApi';
import { Screen } from '@/shared/components/Screen';
import { VoiceInputBar } from '@/shared/components/VoiceInputBar';
import { useResponsive } from '@/shared/hooks/useResponsive';
import {
  colors,
  componentSizes,
  duskGradient,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

const MAX_MESSAGE = 2000;

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Something went wrong.';
}

function ListeningOrb() {
  const bars = [
    spacing.md,
    spacing.portionReadoutGap,
    spacing.homeAskBarRightPadding,
    componentSizes.dockIconSize,
    spacing.md,
  ];
  return (
    <View style={styles.listeningOrb} accessibilityLabel="Listening indicator">
      <View style={styles.halo} />
      <View style={styles.middleRing} />
      <View style={styles.innerRing} />
      <LinearGradient
        colors={[withAlpha(colors.white, 0.92), withAlpha(colors.white, 0.6)]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.orbCore}
      />
      <View style={styles.waveform}>
        {bars.map((height, index) => (
          <View key={`${height}-${index}`} style={[styles.waveBar, { height }]} />
        ))}
      </View>
    </View>
  );
}

function MessageIcon() {
  return (
    <Svg
      width={componentSizes.wellnessActionIcon}
      height={componentSizes.wellnessActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={withAlpha(colors.white, 0.8)}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg
      width={componentSizes.labelUnreadablePreviewIcon}
      height={componentSizes.labelUnreadablePreviewIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke={colors.ink}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
      />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke={colors.ink}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg
      width={componentSizes.wellnessActionIcon}
      height={componentSizes.wellnessActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={withAlpha(colors.white, 0.8)}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ChatPresenceScreen() {
  const router = useRouter();
  const { orientation } = useResponsive();
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState('');
  const propose = useProposeChatMutation();
  const confirm = useConfirmChatMutation();
  const undo = useUndoChatMutation();

  const currentWasUndone = Boolean(
    propose.data?.proposal_id &&
    undo.data?.undone &&
    undo.data.proposal_id === propose.data.proposal_id,
  );
  const response = currentWasUndone ? undefined : propose.data;
  const proposalId = response?.proposal_id;
  const isApplied = Boolean(
    proposalId && confirm.data?.applied && confirm.data.proposal_id === proposalId,
  );
  const trimmedMessage = message.trim();
  const submitDisabled =
    propose.isPending || trimmedMessage.length === 0 || trimmedMessage.length > MAX_MESSAGE;
  const mutationError = errorMessage(undo.error ?? confirm.error ?? propose.error);

  const submit = () => {
    if (submitDisabled) return;
    propose.mutate(trimmedMessage, {
      onSuccess: () => {
        setMessage('');
        setIsTyping(false);
      },
    });
  };

  const transcript = response ? (
    <View style={styles.transcript}>
      <Text style={styles.heard}>{response.heard}</Text>
      {response.line ? <Text style={styles.reply}>{response.line}</Text> : null}
      {response.receipts.length ? (
        <View style={styles.receipts}>
          {response.receipts.map((receipt) => (
            <View key={`${receipt.pillar}-${receipt.kind}`} style={styles.receipt}>
              <Text style={styles.receiptText}>{receipt.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {response.requires_confirmation && proposalId ? (
        <View style={styles.actionRow}>
          {isApplied ? (
            <Pressable
              onPress={() =>
                undo.mutate(proposalId, {
                  onSuccess: () => {
                    setMessage('');
                    setIsTyping(false);
                  },
                })
              }
              disabled={undo.isPending}
              accessibilityRole="button"
              accessibilityLabel="Undo"
              accessibilityState={{ disabled: undo.isPending }}
              style={styles.secondaryAction}
            >
              <Text style={styles.actionText}>Undo</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => confirm.mutate(proposalId, { onSuccess: () => undefined })}
              disabled={confirm.isPending}
              accessibilityRole="button"
              accessibilityLabel="Apply"
              accessibilityState={{ disabled: confirm.isPending }}
              style={styles.secondaryAction}
            >
              <Text style={styles.actionText}>Apply</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      {mutationError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {mutationError}
        </Text>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={duskGradient.colors}
        locations={duskGradient.locations}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent" contentContainerStyle={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>{response?.listening ?? 'Listening'}</Text>
          <View style={[styles.main, orientation === 'landscape' && styles.mainLandscape]}>
            <View style={styles.orbArea}>
              <ListeningOrb />
            </View>
            <View style={styles.responseArea}>{transcript}</View>
          </View>
          {!response && mutationError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {mutationError}
            </Text>
          ) : null}
          {isTyping && !response ? (
            <VoiceInputBar
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message…"
              onSubmit={submit}
              submitDisabled={submitDisabled}
              autoFocus
              style={styles.input}
            />
          ) : (
            <View style={styles.dock}>
              <Pressable
                onPress={() => setIsTyping(true)}
                accessibilityRole="button"
                accessibilityLabel="Type a message"
                style={styles.sideButton}
              >
                <MessageIcon />
              </Pressable>
              <LinearGradient
                colors={[withAlpha(colors.white, 0.95), withAlpha(colors.white, 0.7)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micButton}
              >
                <MicIcon />
              </LinearGradient>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.sideButton}
              >
                <CloseIcon />
              </Pressable>
            </View>
          )}
          {!isTyping ? (
            <Text style={styles.hint}>
              {response?.hint ?? 'Hold to talk · tap the bubble to type'}
            </Text>
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flexGrow: 1 },
  content: {
    flex: 1,
    minHeight: componentSizes.chatListeningCircle * 2,
    paddingHorizontal: spacing.xs,
  },
  eyebrow: {
    ...textStyle('afterSnapEyebrow'),
    color: withAlpha(colors.white, 0.55),
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  main: { flex: 1 },
  mainLandscape: { flexDirection: 'row', gap: spacing.xxxl },
  orbArea: {
    flex: 1,
    minHeight: componentSizes.chatListeningCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseArea: { justifyContent: 'center', flexShrink: 1 },
  listeningOrb: {
    width: componentSizes.chatListeningCircle,
    height: componentSizes.chatListeningCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    inset: 0,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.18),
  },
  middleRing: {
    position: 'absolute',
    inset: componentSizes.chatListeningMiddleInset,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.28),
  },
  innerRing: {
    position: 'absolute',
    inset: componentSizes.chatListeningInnerInset,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.4),
  },
  orbCore: {
    position: 'absolute',
    inset: componentSizes.chatListeningCoreInset,
    borderRadius: radii.pill,
    shadowColor: withAlpha(colors.white, 0.55),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.homeAskBarHeight,
  },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  waveBar: { width: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.ink },
  transcript: { gap: spacing.ms },
  heard: { ...textStyle('chatHeard'), color: withAlpha(colors.white, 0.5), textAlign: 'center' },
  reply: { ...textStyle('bodyLg'), color: colors.rightNowText, textAlign: 'center' },
  receipts: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  receipt: {
    height: componentSizes.chatReceiptHeight,
    paddingHorizontal: spacing.ml - componentSizes.hairline,
    borderRadius: radii.sm,
    backgroundColor: withAlpha(colors.white, 0.16),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptText: { ...textStyle('weightChip'), color: withAlpha(colors.white, 0.75) },
  actionRow: { alignItems: 'center', marginTop: spacing.sm },
  secondaryAction: {
    minWidth: componentSizes.chatListeningCoreInset,
    height: componentSizes.wellnessSecondaryActionHeight,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.planAction,
    backgroundColor: withAlpha(colors.white, 0.14),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { ...textStyle('rightNowButton'), color: withAlpha(colors.white, 0.8) },
  error: { ...textStyle('small'), color: colors.rightNowText, textAlign: 'center' },
  dock: {
    marginTop: spacing.screenPadX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sheetTitleGap,
  },
  sideButton: {
    width: componentSizes.chatSideButtonSize,
    height: componentSizes.chatSideButtonSize,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.14),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: componentSizes.chatMicButtonSize,
    height: componentSizes.chatMicButtonSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: withAlpha(colors.white, 0.55),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: componentSizes.chatReceiptHeight,
  },
  hint: {
    ...textStyle('cardHint'),
    color: withAlpha(colors.white, 0.45),
    textAlign: 'center',
    marginTop: spacing.md,
  },
  input: { marginTop: spacing.xxl },
});
