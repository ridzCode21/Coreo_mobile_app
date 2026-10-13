import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { stripApproxPrefix } from '@/features/nutrition/lib/replacePreview';
import { GlassCard } from '@/shared/components/GlassCard';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { ReplacePreviewAlternative } from '@/shared/types/mealPlan';

type ReplaceCompareScreenProps = {
  visible: boolean;
  alternatives: ReplacePreviewAlternative[];
  selectedIndex: number;
  onUseThisOne: (index: number) => void;
  onBack: () => void;
};

export function ReplaceCompareScreen({
  visible,
  alternatives,
  selectedIndex,
  onUseThisOne,
  onBack,
}: ReplaceCompareScreenProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const optionCount = Math.min(alternatives.length, 3);
  const heading =
    optionCount === 1
      ? "One that fits tonight — pick it, or keep what's planned."
      : optionCount === 2
        ? "Two that fit tonight — pick one, or keep what's planned."
        : "Three that fit tonight — pick one, or keep what's planned.";

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onBack}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, spacing.screenPadTop),
            paddingBottom: Math.max(insets.bottom, spacing.screenPadBottom),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to swap choices"
            style={styles.back}
          >
            <Svg
              width={componentSizes.replaceBackIcon}
              height={componentSizes.replaceBackIcon}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Path
                d="M15 18l-6-6 6-6"
                stroke={colors.ink75}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text style={styles.eyebrow}>Swap dinner</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>{heading}</Text>
        <View style={styles.cards}>
          {alternatives.slice(0, 3).map((alternative, index) => {
            const selected = selectedIndex === index;
            return (
              <GlassCard
                key={`${alternative.name}-${index}`}
                variant={selected ? 'night' : 'light'}
                radius={radii.md}
                style={styles.card}
              >
                <Text style={[styles.cardTitle, selected && styles.onNight]}>
                  {alternative.name}
                </Text>
                <Text style={[styles.macros, selected && styles.onNightMuted]}>
                  {Math.round(alternative.calories_kcal)} kcal · {Math.round(alternative.protein_g)}
                  g{' protein · '}
                  {Math.round(alternative.carbs_g)}g carbs · {Math.round(alternative.fat_g)}g fat
                </Text>
                <Text style={[styles.reason, selected && styles.onNightReason]}>
                  {stripApproxPrefix(alternative.rationale)}
                </Text>
                <Pressable
                  onPress={() => onUseThisOne(index)}
                  accessibilityRole="button"
                  accessibilityLabel="Use this one"
                  accessibilityState={{ selected }}
                  style={[styles.useButton, selected && styles.useButtonSelected]}
                >
                  <Text style={styles.useButtonText}>Use this one</Text>
                </Pressable>
              </GlassCard>
            );
          })}
        </View>
        {optionCount >= 2 ? (
          <Text style={styles.footer}>Only one can be used — the rest fall away.</Text>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.screenPadX },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.42),
    borderColor: withAlpha(colors.white, 0.7),
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: componentSizes.sheetVoiceButton,
    justifyContent: 'center',
    width: componentSizes.sheetVoiceButton,
  },
  eyebrow: { ...textStyle('label'), color: colors.ink45, textAlign: 'center' },
  headerSpacer: { width: componentSizes.sheetVoiceButton },
  subtitle: { ...textStyle('sheetSubtitle'), color: colors.ink55, marginTop: spacing.ml },
  cards: { gap: spacing.ms, marginTop: spacing.ml },
  card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.ml },
  cardTitle: { ...textStyle('replaceCompareTitle'), color: colors.ink },
  macros: { ...textStyle('legal'), color: colors.ink55, marginTop: spacing.xs },
  reason: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink70,
    marginTop: spacing.sliderCaptionGap,
  },
  onNight: { color: colors.onNight },
  onNightMuted: { color: withAlpha(colors.fog, 0.6) },
  onNightReason: { color: withAlpha(colors.fog, 0.75) },
  useButton: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.45),
    borderColor: withAlpha(colors.white, 0.7),
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: componentSizes.replaceCompareActionHeight,
    justifyContent: 'center',
    marginTop: spacing.ms,
  },
  useButtonSelected: { backgroundColor: colors.white },
  useButtonText: { ...textStyle('small'), color: colors.ink },
  footer: {
    ...textStyle('legal'),
    color: colors.ink45,
    marginTop: 'auto',
    paddingTop: spacing.lg,
    textAlign: 'center',
  },
});
