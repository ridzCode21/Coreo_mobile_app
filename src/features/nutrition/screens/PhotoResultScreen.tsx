import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  afterSnapPhotoOverlay,
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import { todayISO, useCreateFoodEntriesMutation } from '@/features/nutrition/api/nutritionApi';
import {
  AfterSnapBackIcon,
  AfterSnapCheckIcon,
} from '@/features/nutrition/components/AfterSnapIcons';
import { currentMealByClock, MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import { itemsToEntries, pickGuessNote, sortByGuessed } from '@/features/nutrition/lib/photoResult';
import {
  photoResultPrefillSchema,
  photoResultRouteParamsSchema,
  type PhotoReceiptSummary,
  type PhotoResultPrefill,
} from '@/features/nutrition/schemas';

const PHOTO_BORDER = withAlpha(colors.white, 0.6);
const PHOTO_BADGE_BACKGROUND = withAlpha(colors.midnight, 0.5);
const PHOTO_BADGE_BORDER = withAlpha(colors.white, 0.25);
const PHOTO_BADGE_TEXT = withAlpha(colors.white, 0.85);
const PHOTO_CHIP_BACKGROUND = withAlpha(colors.white, 0.85);
const PHOTO_GUESSED_BACKGROUND = withAlpha(colors.ink, 0.85);
const SUMMARY_UNIT = withAlpha(colors.fog, 0.55);
const SUMMARY_MACROS = withAlpha(colors.fog, 0.5);

function parsePrefill(raw?: string): PhotoResultPrefill | null {
  if (!raw) return null;
  try {
    return photoResultPrefillSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export default function PhotoResultScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ prefill?: string; photoUri?: string }>();
  const routeParams = photoResultRouteParamsSchema.safeParse(rawParams);
  const prefill = parsePrefill(routeParams.success ? routeParams.data.prefill : undefined);
  const mealType = prefill?.meal_type ?? currentMealByClock();
  const createEntries = useCreateFoodEntriesMutation(todayISO());
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!prefill || !routeParams.success) {
    return (
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <Screen background="transparent">
          <Text style={styles.routeError}>I couldn&apos;t open that photo result.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Diet"
            onPress={() => router.replace('/diet')}
            style={styles.errorAction}
          >
            <Text style={styles.errorActionText}>Back to Diet</Text>
          </Pressable>
        </Screen>
      </View>
    );
  }

  const normalizedPrefill = { ...prefill, meal_type: mealType };
  const guess = prefill.guessed_count > 0 ? pickGuessNote(prefill.items) : null;
  const displayItems = sortByGuessed(prefill.items);
  const confirmUrl = () => {
    const query = new URLSearchParams({
      source: 'photo',
      prefill: JSON.stringify(normalizedPrefill),
    });
    return `/diet/confirm?${query.toString()}` as Href;
  };

  const submit = async () => {
    setSubmitError(null);
    try {
      await createEntries.mutateAsync(itemsToEntries(prefill.items, mealType));
      const summary: PhotoReceiptSummary = {
        food_name: prefill.food_name,
        calories: prefill.calories,
        protein_g: prefill.protein_g,
        carbs_g: prefill.carbs_g,
        fat_g: prefill.fat_g,
        meal_type: mealType,
        items: prefill.items,
      };
      const query = new URLSearchParams({ summary: JSON.stringify(summary) });
      router.replace(`/diet/receipt?${query.toString()}` as Href);
    } catch {
      setSubmitError("That didn't save — check your connection and try again.");
    }
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/diet')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={spacing.xs}
            style={styles.backButton}
          >
            <LinearGradient
              colors={glass.afterSnapNav.gradient}
              start={glass.afterSnapNav.start}
              end={glass.afterSnapNav.end}
              style={styles.backButtonFill}
            >
              <AfterSnapBackIcon />
            </LinearGradient>
          </Pressable>
          <Text style={styles.eyebrow}>Logged · {MEAL_LABEL[mealType]}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.photoFrame}>
          <Image
            source={{ uri: routeParams.data.photoUri }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={afterSnapPhotoOverlay.colors}
            locations={afterSnapPhotoOverlay.locations}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.photoBadge}>Your photo</Text>
          <View style={styles.chips}>
            {displayItems.map((item, index) => (
              <Text
                key={`${item.name}-${index}`}
                style={[styles.photoChip, item.guessed && styles.photoChipGuessed]}
              >
                {item.guessed
                  ? `${item.name}?`
                  : `${item.name}${item.portion_label ? ` · ${item.portion_label}` : ''}`}
              </Text>
            ))}
          </View>
        </View>

        <GlassCard
          variant="dietHero"
          radius={radii.dietNextMeal}
          style={styles.summaryCard}
          contentPaddingVertical={spacing.lg}
          contentPaddingHorizontal={spacing.xl}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>{prefill.food_name}</Text>
            <View style={styles.summaryCalories}>
              <Text style={styles.summaryNumber}>{prefill.calories}</Text>
              <Text style={styles.summaryUnit}>kcal</Text>
            </View>
          </View>
          <Text style={styles.summaryMacros}>
            P {prefill.protein_g}g · C {prefill.carbs_g}g · F {prefill.fat_g}g
          </Text>
        </GlassCard>

        {guess ? (
          <GlassCard
            variant="afterSnapSurface"
            radius={radii.md}
            style={styles.guessCard}
            contentPaddingVertical={spacing.afterSnapGuessPaddingY}
            contentPaddingHorizontal={spacing.afterSnapGuessPaddingX}
          >
            <View style={styles.guessRow}>
              <View style={styles.guessCopy}>
                <Text style={styles.guessTitle}>One thing I couldn&apos;t see</Text>
                <Text style={styles.guessNote}>{guess.note}</Text>
              </View>
              <Pressable
                onPress={() => router.push(confirmUrl())}
                accessibilityRole="button"
                accessibilityLabel="Fix"
                hitSlop={spacing.sm}
                style={styles.fixButton}
              >
                <Text style={styles.fixText}>Fix</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : null}

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Pressable
          onPress={submit}
          disabled={createEntries.isPending}
          accessibilityRole="button"
          accessibilityLabel="Looks right — log it"
          accessibilityState={{ disabled: createEntries.isPending }}
          style={styles.submitGlow}
        >
          <LinearGradient
            colors={glass.chipSelected.gradient}
            start={glass.chipSelected.start}
            end={glass.chipSelected.end}
            style={styles.submit}
          >
            <Text style={styles.submitText}>Looks right</Text>
            <View style={styles.submitCheck}>
              {createEntries.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <AfterSnapCheckIcon size={componentSizes.mealReviewCheckIcon} />
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: {
    width: componentSizes.mealReviewBackControl,
    height: componentSizes.mealReviewBackControl,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  backButtonFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  headerSpacer: { width: componentSizes.mealReviewBackControl },
  photoFrame: {
    height: componentSizes.afterSnapPhotoHeight,
    marginTop: spacing.afterSnapPhotoTop,
    borderRadius: radii.afterSnapPhoto,
    overflow: 'hidden',
    borderWidth: componentSizes.hairline,
    borderColor: PHOTO_BORDER,
    shadowColor: glass.chipSelected.shadowColor,
    shadowOpacity: 1,
    shadowRadius: spacing.xl,
    shadowOffset: { width: 0, height: spacing.xl },
    elevation: componentSizes.dietElevation,
  },
  photoBadge: {
    ...textStyle('afterSnapPhotoBadge'),
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    height: componentSizes.afterSnapPhotoBadgeHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.dietWeightChip,
    borderWidth: componentSizes.hairline,
    borderColor: PHOTO_BADGE_BORDER,
    backgroundColor: PHOTO_BADGE_BACKGROUND,
    color: PHOTO_BADGE_TEXT,
    textAlignVertical: 'center',
    paddingTop: spacing.xs,
  },
  chips: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.afterSnapChipGap,
  },
  photoChip: {
    ...textStyle('afterSnapPhotoChip'),
    height: componentSizes.afterSnapPhotoChipHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: PHOTO_CHIP_BACKGROUND,
    color: colors.ink,
    textAlignVertical: 'center',
    paddingTop: spacing.sliderCaptionGap,
  },
  photoChipGuessed: { backgroundColor: PHOTO_GUESSED_BACKGROUND, color: colors.onNight },
  summaryCard: { marginTop: spacing.afterSnapSummaryTop },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  summaryTitle: { ...textStyle('afterSnapMealTitle'), color: colors.onNight, flexShrink: 1 },
  summaryCalories: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  summaryNumber: { ...textStyle('mealReviewSummaryValue'), color: colors.onNight },
  summaryUnit: { ...textStyle('cardHint'), color: SUMMARY_UNIT },
  summaryMacros: {
    ...textStyle('afterSnapSummaryMacros'),
    color: SUMMARY_MACROS,
    marginTop: spacing.xs,
  },
  guessCard: { marginTop: spacing.afterSnapGuessTop },
  guessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guessCopy: { flex: 1 },
  guessTitle: { ...textStyle('linkMd'), color: colors.ink },
  guessNote: {
    ...textStyle('legal'),
    color: colors.ink55,
    marginTop: spacing.mealReviewRememberedTop,
  },
  fixButton: {
    minWidth: componentSizes.minimumTapTarget,
    height: componentSizes.afterSnapGuessActionHeight,
    paddingHorizontal: spacing.ml,
    borderRadius: radii.legal,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixText: { ...textStyle('legal'), color: colors.white },
  submitError: {
    ...textStyle('caption'),
    color: colors.attention,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  submitGlow: { marginTop: spacing.ml, borderRadius: radii.dietLogPill },
  submit: {
    height: componentSizes.afterSnapResultActionHeight,
    borderRadius: radii.dietLogPill,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitText: { ...textStyle('buttonSm'), color: colors.ink },
  submitCheck: {
    width: componentSizes.mealReviewCheckCircle,
    height: componentSizes.mealReviewCheckCircle,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeError: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  errorAction: { minHeight: componentSizes.minimumTapTarget, justifyContent: 'center' },
  errorActionText: { ...textStyle('linkMd'), color: colors.ink75, textAlign: 'center' },
});
