import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  type MemoryFact,
  useCorrectMemoryFactMutation,
  useDeleteAllMemoryFactsMutation,
  useDeleteMemoryFactMutation,
  useMemoryFactsQuery,
} from '@/features/profile/api/memoryFactsApi';
import {
  memoryFactCorrectionSchema,
  type MemoryFactCorrectionValues,
} from '@/features/profile/schemas';
import { BackButton } from '@/shared/components/BackButton';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import {
  colors,
  componentSizes,
  radii,
  sheetSkyGradient,
  spacing,
  typography,
} from '@/shared/theme/tokens';

export default function NotebookScreen() {
  const router = useRouter();
  const notebook = useMemoryFactsQuery();
  const correct = useCorrectMemoryFactMutation();
  const deleteFact = useDeleteMemoryFactMutation();
  const deleteAll = useDeleteAllMemoryFactsMutation();
  const [editing, setEditing] = useState<MemoryFact | null>(null);
  const { control, handleSubmit, reset } = useForm<MemoryFactCorrectionValues>({
    resolver: zodResolver(memoryFactCorrectionSchema),
    defaultValues: { text: '' },
  });
  const data = notebook.data;

  const beginCorrection = (fact: MemoryFact) => {
    setEditing(fact);
    reset({ text: fact.text });
  };
  const saveCorrection = (values: MemoryFactCorrectionValues) => {
    if (!editing) return;
    correct.mutate({ id: editing.id, text: values.text }, { onSuccess: () => setEditing(null) });
  };
  const confirmFactDeletion = (fact: MemoryFact) =>
    Alert.alert('Delete memory', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFact.mutate(fact.id) },
    ]);
  const confirmAllDeletion = () =>
    Alert.alert('Delete all memories', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => deleteAll.mutate() },
    ]);

  if (!data) {
    return (
      <LinearGradient {...sheetSkyGradient} style={styles.root}>
        <Screen background="transparent" scroll={false}>
          <View style={styles.unavailable}>
            {notebook.isError ? (
              <Text style={styles.status}>Unable to load your notebook.</Text>
            ) : (
              <ActivityIndicator color={colors.ink45} />
            )}
          </View>
        </Screen>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient {...sheetSkyGradient} style={styles.root}>
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.eyebrow}>{data.eyebrow}</Text>
          <View style={styles.backSpacer} />
        </View>
        <View style={styles.heading}>
          <Text style={styles.title}>
            {data.title} <Text style={styles.titleEmphasis}>{data.subtitle}</Text>
          </Text>
        </View>
        <View style={styles.facts}>
          {data.facts.map((fact) => {
            const isNew = fact.badge === 'New';
            const card = (
              <GlassCard variant={isNew ? 'night' : 'light'} radius={radii.md} padded={false}>
                <View style={styles.fact}>
                  <View style={styles.factText}>
                    <Text style={isNew ? styles.nightText : styles.factCopy}>{fact.text}</Text>
                    <Text style={isNew ? styles.nightSource : styles.source}>
                      {fact.source_label}
                    </Text>
                  </View>
                  {isNew ? <Text style={styles.badge}>New</Text> : null}
                  {!isNew ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Correct: ${fact.text}`}
                      onPress={() => beginCorrection(fact)}
                      style={styles.pencil}
                    >
                      <Svg
                        width={componentSizes.readingSourceIcon}
                        height={componentSizes.readingSourceIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"
                          stroke={colors.ink40}
                          strokeWidth={componentSizes.readingSourceIconStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Pressable>
                  ) : null}
                </View>
              </GlassCard>
            );

            return isNew ? (
              <Pressable
                key={fact.id}
                accessibilityRole="button"
                accessibilityLabel="Correct new memory"
                onPress={() => beginCorrection(fact)}
              >
                {card}
              </Pressable>
            ) : (
              <View key={fact.id}>{card}</View>
            );
          })}
        </View>
        {editing ? (
          <GlassCard variant="light" radius={radii.md}>
            <Controller
              control={control}
              name="text"
              render={({ field }) => (
                <TextInput
                  accessibilityLabel="Correction"
                  value={field.value}
                  onChangeText={field.onChange}
                  style={styles.input}
                  multiline
                />
              )}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save correction"
              onPress={handleSubmit(saveCorrection)}
            >
              <Text style={styles.action}>Save</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete: ${editing.text}`}
              onPress={() => confirmFactDeletion(editing)}
            >
              <Text style={styles.action}>Delete</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete all notebook facts"
              onPress={confirmAllDeletion}
            >
              <Text style={styles.action}>Delete all</Text>
            </Pressable>
          </GlassCard>
        ) : null}
        <GlassCard
          variant="light"
          radius={radii.md}
          contentPaddingVertical={spacing.notebookFooterPadY}
          contentPaddingHorizontal={spacing.notebookFooterPadX}
        >
          <Text style={styles.footer}>{data.footer}</Text>
        </GlassCard>
        <GlassCard
          variant="night"
          radius={radii.xl}
          style={styles.prompt}
          contentPaddingVertical={0}
          contentPaddingLeft={spacing.notebookPromptPadLeft}
          contentPaddingRight={spacing.notebookPromptPadRight}
        >
          <Text style={styles.promptText}>{data.prompt}</Text>
          <View accessibilityLabel="Notebook prompt icon" style={styles.promptIcon}>
            <Svg
              width={componentSizes.replaceBackIcon}
              height={componentSizes.replaceBackIcon}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Rect
                x="9"
                y="3"
                width="6"
                height="11"
                rx="3"
                stroke={colors.ink}
                strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
              />
              <Path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke={colors.ink}
                strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
              />
            </Svg>
          </View>
        </GlassCard>
      </Screen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  status: { ...typography.wellnessStep, color: colors.ink65, textAlign: 'center' },
  unavailable: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: spacing.md },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backSpacer: { width: componentSizes.dietHeaderControl },
  eyebrow: { ...typography.afterSnapEyebrow, color: colors.ink45 },
  heading: { marginTop: spacing.ml },
  title: { ...typography.wellnessHeadline, color: colors.ink },
  titleEmphasis: { ...typography.wellnessHeadline, color: colors.ink, fontWeight: '400' },
  facts: { gap: spacing.sm },
  fact: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.fieldPadX,
    paddingVertical: spacing.fieldPadY,
  },
  factText: { flex: 1 },
  factCopy: { ...typography.wellnessStep, color: colors.ink },
  nightText: { ...typography.wellnessStep, color: colors.onNight },
  source: { ...typography.wellnessStepReason, color: colors.ink45, marginTop: spacing.xs },
  nightSource: {
    ...typography.wellnessStepReason,
    color: colors.usualOnNightMuted,
    marginTop: spacing.xs,
  },
  pencil: {
    alignItems: 'center',
    height: componentSizes.minimumTapTarget,
    justifyContent: 'center',
    width: componentSizes.minimumTapTarget,
  },
  badge: {
    ...typography.notebookBadge,
    backgroundColor: colors.white,
    borderRadius: radii.dietWeightChip,
    color: colors.ink,
    height: componentSizes.notebookBadgeHeight,
    lineHeight: componentSizes.notebookBadgeHeight,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  footer: { ...typography.usualFooter, color: colors.ink65 },
  prompt: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: componentSizes.profileKnowledgeMinHeight,
  },
  promptText: { ...typography.wellnessStep, color: colors.usualOnNightMuted, flex: 1 },
  promptIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    height: componentSizes.notebookPromptIcon,
    justifyContent: 'center',
    width: componentSizes.notebookPromptIcon,
  },
  input: {
    ...typography.wellnessStep,
    color: colors.ink,
    minHeight: componentSizes.minimumTapTarget,
  },
  action: { ...typography.mealReviewFix, color: colors.ink, marginTop: spacing.sm },
});
