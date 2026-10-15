import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { ApiError } from '@/shared/api/errors';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  unreadablePhotoGradient,
  withAlpha,
} from '@/shared/theme/tokens';
import {
  useAnalyzePhotoMutation,
  useUsualsQuery,
  type PhotoUploadFile,
} from '@/features/nutrition/api/nutritionApi';
import { AfterSnapBackIcon } from '@/features/nutrition/components/AfterSnapIcons';
import { currentMealByClock, MEAL_LABEL } from '@/features/nutrition/lib/mealClock';
import {
  captureMealPhotoFromCamera,
  pickMealPhotoFromLibrary,
} from '@/features/nutrition/lib/photoCapture';
import { photoUnreadableRouteParamsSchema } from '@/features/nutrition/schemas';

const FALLBACK_TITLE = "I couldn't read that plate.";
const FALLBACK_MESSAGE = "Too dark, maybe. Describe it and I've got you.";
const PHOTO_RESULT_ROUTE = '/diet/photo-result';
const PHOTO_UNREADABLE_ROUTE = '/diet/photo-unreadable';

function UnreadablePhotoIcon() {
  return (
    <Svg
      width={componentSizes.photoUnreadableIcon}
      height={componentSizes.photoUnreadableIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"
        stroke={withAlpha(colors.white, 0.45)}
        strokeWidth={componentSizes.photoUnreadableIconStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 2l20 20"
        stroke={withAlpha(colors.white, 0.75)}
        strokeWidth={componentSizes.photoUnreadableIconStrokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DescribeIcon() {
  return (
    <Svg
      width={componentSizes.photoUnreadableActionIcon}
      height={componentSizes.photoUnreadableActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke={colors.white}
        strokeWidth={componentSizes.photoUnreadableIconStrokeWidth}
      />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke={colors.white}
        strokeWidth={componentSizes.photoUnreadableIconStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function actionShadow(): ViewStyle {
  return {
    shadowColor: glass.photoUnreadableAction.shadowColor,
    shadowOffset: { width: 0, height: spacing.ml },
    shadowOpacity: 1,
    shadowRadius: spacing.photoUnreadableActionShadowRadius,
    elevation: componentSizes.dietElevation,
  };
}

export default function PhotoUnreadableScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{
    title?: string;
    message?: string;
    mealType?: string;
  }>();
  const parsedParams = photoUnreadableRouteParamsSchema.safeParse(rawParams);
  const params = parsedParams.success ? parsedParams.data : {};
  const mealType = params.mealType ?? currentMealByClock();
  const title = params.title ?? FALLBACK_TITLE;
  const message = params.message ?? FALLBACK_MESSAGE;
  const usuals = useUsualsQuery(mealType);
  const analyzePhoto = useAnalyzePhotoMutation();
  const suggestions = usuals.data?.suggestions ?? [];

  const describe = () => {
    const query = new URLSearchParams({
      source: 'manual',
      prefill: JSON.stringify({ meal_type: mealType }),
    });
    router.replace(`/diet/confirm?${query.toString()}` as Href);
  };

  const analyze = (file: PhotoUploadFile) => {
    analyzePhoto.mutate(file, {
      onSuccess: (estimate) => {
        const query = new URLSearchParams({
          source: 'photo',
          photoUri: file.uri,
          prefill: JSON.stringify({
            food_name: estimate.name,
            meal_type: mealType,
            calories: estimate.est_calories,
            protein_g: estimate.est_protein_g,
            carbs_g: estimate.est_carbs_g,
            fat_g: estimate.est_fat_g,
            guessed_count: estimate.guessed_count,
            items: estimate.items,
          }),
        });
        router.push(`${PHOTO_RESULT_ROUTE}?${query.toString()}` as Href);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 422) {
          const details = error.details as { error?: unknown; message?: unknown } | undefined;
          const query = new URLSearchParams({ mealType });
          if (typeof details?.error === 'string') query.set('title', details.error);
          if (typeof details?.message === 'string') query.set('message', details.message);
          router.replace(`${PHOTO_UNREADABLE_ROUTE}?${query.toString()}` as Href);
          return;
        }
        router.replace('/diet');
      },
    });
  };

  const tryAnotherPhoto = async () => {
    try {
      const capture = await captureMealPhotoFromCamera();
      if (capture.status === 'permission_denied') {
        const fromLibrary = await pickMealPhotoFromLibrary();
        if (fromLibrary.status === 'ok') analyze(fromLibrary.file);
        return;
      }
      if (capture.status === 'ok') analyze(capture.file);
    } catch {
      router.replace('/diet');
    }
  };

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.layout}>
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
            <Text style={styles.eyebrow}>Snap · {MEAL_LABEL[mealType]}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.photoWrap}>
            <View style={styles.photoPlaceholderShadow}>
              <LinearGradient
                colors={unreadablePhotoGradient.colors}
                start={unreadablePhotoGradient.start}
                end={unreadablePhotoGradient.end}
                style={styles.photoPlaceholder}
              >
                <View style={styles.photoOverlay} />
                <UnreadablePhotoIcon />
              </LinearGradient>
            </View>
          </View>

          <View style={styles.messageBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={describe}
              accessibilityRole="button"
              accessibilityLabel="Describe it"
              style={styles.describeShadow}
            >
              <LinearGradient
                colors={glass.photoUnreadableAction.gradient}
                start={glass.photoUnreadableAction.start}
                end={glass.photoUnreadableAction.end}
                style={styles.describeAction}
              >
                <DescribeIcon />
                <View>
                  <Text style={styles.describeTitle}>Describe it</Text>
                  <Text style={styles.describeSubtitle}>Type or talk it out</Text>
                </View>
              </LinearGradient>
            </Pressable>

            {suggestions.length > 0 ? (
              <View>
                <Text style={styles.usualsLabel}>Your usuals</Text>
                <View style={styles.usualsList}>
                  {suggestions.map((suggestion) => (
                    <View
                      key={`${suggestion.kind}-${suggestion.food_name}`}
                      style={styles.usualChip}
                    >
                      <Text style={styles.usualChipText}>{suggestion.food_name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={tryAnotherPhoto}
              disabled={analyzePhoto.isPending}
              accessibilityRole="button"
              accessibilityLabel="Try another photo"
              accessibilityState={{ disabled: analyzePhoto.isPending }}
              hitSlop={spacing.lg}
              style={styles.retryAction}
            >
              <Text style={styles.retryText}>Try another photo</Text>
            </Pressable>
          </View>

          <View style={styles.footerSpacer} />
          <Text style={styles.footer}>Nothing was logged yet.</Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  layout: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: componentSizes.mealReviewBackControl,
    height: componentSizes.mealReviewBackControl,
    borderRadius: radii.pill,
    shadowColor: glass.afterSnapNav.shadowColor,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: spacing.sheetTitleGap,
    elevation: componentSizes.dietElevation,
  },
  backButtonFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.afterSnapNav.border,
  },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45 },
  headerSpacer: {
    width: componentSizes.mealReviewBackControl,
    height: componentSizes.mealReviewBackControl,
  },
  photoWrap: { marginTop: spacing.sheetTitleGap, alignItems: 'center' },
  photoPlaceholderShadow: {
    width: componentSizes.photoUnreadablePlaceholderWidth,
    height: componentSizes.photoUnreadablePlaceholderHeight,
    borderRadius: radii.md,
    shadowColor: withAlpha(colors.overlayInk, 0.16),
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 1,
    shadowRadius: spacing.xxl,
    elevation: componentSizes.dietElevation,
  },
  photoPlaceholder: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.6),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.unreadablePhotoOverlay,
  },
  messageBlock: { marginTop: spacing.xl, alignItems: 'center' },
  title: { ...textStyle('photoUnreadableTitle'), color: colors.ink, textAlign: 'center' },
  message: {
    ...textStyle('body'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: { marginTop: spacing.xl, gap: spacing.ms },
  describeShadow: { ...actionShadow(), borderRadius: radii.ml },
  describeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.photoUnreadableActionPaddingX,
    borderRadius: radii.ml,
  },
  describeTitle: { ...textStyle('photoUnreadableActionTitle'), color: colors.onNight },
  describeSubtitle: {
    ...textStyle('legal'),
    color: withAlpha(colors.fog, 0.6),
    marginTop: spacing.sheetSubtitleGap,
  },
  usualsLabel: {
    ...textStyle('photoUnreadableUsualLabel'),
    color: colors.ink40,
    paddingHorizontal: spacing.sheetSubtitleGap,
    paddingBottom: spacing.sm,
  },
  usualsList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  usualChip: {
    height: componentSizes.photoUnreadableUsualHeight,
    paddingHorizontal: spacing.photoUnreadableUsualPaddingX,
    borderRadius: radii.photoUnreadableUsual,
    backgroundColor: withAlpha(colors.white, 0.6),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.75),
    alignItems: 'center',
    justifyContent: 'center',
  },
  usualChipText: { ...textStyle('photoUnreadableUsualChip'), color: colors.ink },
  retryAction: {
    paddingTop: spacing.sheetSubtitleGap,
    alignItems: 'center',
  },
  retryText: { ...textStyle('linkMd'), color: colors.ink55, textDecorationLine: 'underline' },
  footerSpacer: { flex: 1, minHeight: spacing.xxl },
  footer: { ...textStyle('legal'), color: colors.ink40, textAlign: 'center' },
});
