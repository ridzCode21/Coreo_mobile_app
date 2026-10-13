import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { stripApproxPrefix } from '@/features/nutrition/lib/replacePreview';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { QuotaExceededError, ReplacePreviewAlternative } from '@/shared/types/mealPlan';

type ReplacePromptSheetProps = {
  visible: boolean;
  preference: string;
  onPreference: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  alternatives: ReplacePreviewAlternative[] | null;
  quotaError: QuotaExceededError | null;
  serviceUnavailable: boolean;
  onPick: (index: number) => void;
  onClose: () => void;
};

export function ReplacePromptSheet({
  visible,
  preference,
  onPreference,
  onSubmit,
  loading,
  alternatives,
  quotaError,
  serviceUnavailable,
  onPick,
  onClose,
}: ReplacePromptSheetProps) {
  const preferenceInput = useRef<TextInput>(null);
  const hasOptions = Boolean(alternatives?.length);
  const subtitle = hasOptions
    ? "Tell me what you'd rather have, or just pick one."
    : alternatives !== null && !quotaError && !serviceUnavailable
      ? "Nothing I'd swap in tonight."
      : '';

  return (
    <MealSheetSkyFrame visible={visible} title="Swap dinner?" subtitle={subtitle} onClose={onClose}>
      {loading ? (
        <View testID="replace-prompt-loading" style={styles.loading}>
          <ActivityIndicator color={colors.ink45} />
        </View>
      ) : quotaError ? (
        <QuotaBanner error={quotaError} />
      ) : serviceUnavailable ? (
        <View style={styles.messageBlock}>
          <Text style={styles.emptyTitle}>This is taking a moment.</Text>
          <Text style={styles.emptyBody}>
            Your plan is safe. Try the swap options again shortly.
          </Text>
          <Pressable
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {!hasOptions ? (
            <View>
              <Text style={styles.emptyBody}>
                Nothing on hand fit your goals or your allergy note tonight. Tonight&apos;s plan
                stays as is — or tell me what you&apos;re in the mood for and I&apos;ll look again.
              </Text>
            </View>
          ) : null}

          <GlassCard variant="night" radius={radii.pill} padded={false} style={styles.inputCard}>
            <View style={styles.inputRow}>
              <TextInput
                ref={preferenceInput}
                value={preference}
                onChangeText={onPreference}
                onSubmitEditing={onSubmit}
                returnKeyType="done"
                placeholder="e.g. something with less rice"
                placeholderTextColor={withAlpha(colors.fog, 0.55)}
                accessibilityLabel="Swap preference"
                style={styles.input}
              />
              <Pressable
                onPress={() => preferenceInput.current?.focus()}
                accessibilityRole="button"
                accessibilityLabel="Voice input"
                style={styles.voiceButton}
              >
                <Svg
                  width={componentSizes.sheetVoiceIcon}
                  height={componentSizes.sheetVoiceIcon}
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
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M5 11a7 7 0 0 0 14 0M12 18v3"
                    stroke={colors.ink}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            </View>
          </GlassCard>

          {hasOptions ? (
            <View style={styles.options}>
              {alternatives?.slice(0, 3).map((alternative, index) => (
                <Pressable
                  key={`${alternative.name}-${index}`}
                  onPress={() => onPick(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${alternative.name}, ${stripApproxPrefix(alternative.rationale)}, ${alternative.calories_kcal}`}
                >
                  <GlassCard variant="chip" radius={radii.control} padded={false}>
                    <View style={styles.optionRow}>
                      <View style={styles.radio} />
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionName}>{alternative.name}</Text>
                        <Text style={styles.optionReason}>
                          {stripApproxPrefix(alternative.rationale)}
                        </Text>
                      </View>
                      <Text style={styles.optionKcal}>{alternative.calories_kcal}</Text>
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Keep tonight's plan"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Keep tonight&apos;s plan</Text>
            </Pressable>
          )}
        </>
      )}
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: spacing.xxxl },
  messageBlock: { marginTop: spacing.lg },
  emptyTitle: { ...textStyle('sheetSubtitle'), color: colors.ink55 },
  emptyBody: { ...textStyle('bodySm'), color: colors.ink60, marginTop: spacing.md },
  inputCard: { marginTop: spacing.ml },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.ms,
    height: componentSizes.sheetControlHeight,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
  },
  input: { ...textStyle('small'), color: colors.onNight, flex: 1, padding: 0 },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    height: componentSizes.sheetVoiceButton,
    justifyContent: 'center',
    width: componentSizes.sheetVoiceButton,
  },
  options: { gap: spacing.sm, marginTop: spacing.lg },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  radio: {
    borderColor: colors.ink40,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: componentSizes.replaceOptionRadio,
    width: componentSizes.replaceOptionRadio,
  },
  optionCopy: { flex: 1 },
  optionName: { ...textStyle('replaceOption'), color: colors.ink },
  optionReason: { ...textStyle('legal'), color: colors.ink50, marginTop: spacing.sheetSubtitleGap },
  optionKcal: { ...textStyle('small'), color: colors.ink55 },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.45),
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.ml,
    minHeight: componentSizes.sheetControlHeight,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: { ...textStyle('replaceOptionSelected'), color: colors.ink },
});
