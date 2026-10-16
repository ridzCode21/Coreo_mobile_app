import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { AfterSnapBackIcon } from '@/features/nutrition/components/AfterSnapIcons';
import { labelUnreadableRouteParamsSchema } from '@/features/nutrition/schemas';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import {
  colors,
  componentSizes,
  glass,
  labelUnreadablePreviewGradient,
  radii,
  spacing,
  textStyle,
} from '@/shared/theme/tokens';

const DEFAULT_TITLE = "I couldn't read that label.";
const DEFAULT_MESSAGE = "Too blurry, maybe. Describe it and I've got you.";

function LabelUnavailableIcon() {
  return (
    <Svg
      width={componentSizes.labelUnreadablePreviewIcon}
      height={componentSizes.labelUnreadablePreviewIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Rect
        x={4}
        y={3}
        width={16}
        height={18}
        rx={2}
        stroke={colors.labelPreviewMuted}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
      <Path
        d="M8 8h8M8 12h8M8 16h5"
        stroke={colors.labelPreviewMuted}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
      <Path
        d="M2 2l20 20"
        stroke={colors.labelPreviewStrong}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
    </Svg>
  );
}

function DescribeIcon({ color }: { color: string }) {
  return (
    <Svg
      width={componentSizes.labelUnreadableActionIcon}
      height={componentSizes.labelUnreadableActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke={color}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke={color}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
    </Svg>
  );
}

function BarcodeIcon({ color }: { color: string }) {
  return (
    <Svg
      width={componentSizes.labelUnreadableActionIcon}
      height={componentSizes.labelUnreadableActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M3 5v14M8 5v14M13 5v9M13 17v2M17 5v5M17 13v6M21 5v14"
        stroke={color}
        strokeWidth={componentSizes.labelScanIconStrokeWidth}
      />
    </Svg>
  );
}

export default function LabelUnreadableScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ title?: string; message?: string }>();
  const parsed = labelUnreadableRouteParamsSchema.safeParse(rawParams);
  const title = parsed.success ? (parsed.data.title ?? DEFAULT_TITLE) : DEFAULT_TITLE;
  const message = parsed.success ? (parsed.data.message ?? DEFAULT_MESSAGE) : DEFAULT_MESSAGE;

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
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
          <Text style={styles.eyebrow}>Label · Snack</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.preview}>
          <LinearGradient
            colors={labelUnreadablePreviewGradient.colors}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.previewShade]} />
          <LabelUnavailableIcon />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Describe it — Name the product, I'll look it up"
            onPress={() => router.push('/diet/confirm?source=manual' as Href)}
          >
            <GlassCard variant="labelRecovery" radius={radii.ml} padded={false}>
              <View style={styles.actionRow}>
                <DescribeIcon color={colors.white} />
                <View>
                  <Text style={styles.primaryActionTitle}>Describe it</Text>
                  <Text style={styles.primaryActionDetail}>
                    Name the product, I&apos;ll look it up
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan barcode instead — Most packaged foods have one"
            onPress={() => router.push('/diet/scan' as Href)}
          >
            <GlassCard variant="afterSnapSurface" radius={radii.ml} padded={false}>
              <View style={styles.actionRow}>
                <BarcodeIcon color={colors.ink75} />
                <View>
                  <Text style={styles.secondaryActionTitle}>Scan barcode instead</Text>
                  <Text style={styles.secondaryActionDetail}>Most packaged foods have one</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try another photo"
            onPress={() => router.back()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Try another photo</Text>
          </Pressable>
        </View>

        <Text style={styles.nothingLogged}>Nothing was logged yet.</Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    borderRadius: radii.pill,
    height: componentSizes.mealReviewBackControl,
    overflow: 'hidden',
    width: componentSizes.mealReviewBackControl,
  },
  backButtonFill: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerSpacer: { width: componentSizes.mealReviewBackControl },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  preview: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.labelPreviewBorder,
    borderRadius: radii.afterSnapMacro,
    borderWidth: componentSizes.hairline,
    height: componentSizes.labelUnreadablePreviewHeight,
    justifyContent: 'center',
    marginTop: spacing.labelUnreadablePreviewTop,
    overflow: 'hidden',
    width: componentSizes.labelUnreadablePreviewWidth,
  },
  previewShade: { backgroundColor: colors.labelPreviewShade },
  titleBlock: { marginTop: spacing.labelUnreadableTitleTop },
  title: { ...textStyle('labelUnreadableTitle'), color: colors.ink, textAlign: 'center' },
  message: {
    ...textStyle('body'),
    color: colors.ink60,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: { gap: spacing.ms, marginTop: spacing.xl },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sheetTitleGap,
    paddingVertical: spacing.lg,
  },
  primaryActionTitle: { ...textStyle('labelRecoveryTitle'), color: colors.onNight },
  primaryActionDetail: {
    ...textStyle('legal'),
    color: colors.onNight60,
    marginTop: spacing.sheetSubtitleGap,
  },
  secondaryActionTitle: { ...textStyle('labelRecoveryTitleLight'), color: colors.ink },
  secondaryActionDetail: {
    ...textStyle('legal'),
    color: colors.ink55,
    marginTop: spacing.sheetSubtitleGap,
  },
  retry: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.minimumTapTarget,
  },
  retryText: { ...textStyle('linkMd'), color: colors.ink55, textDecorationLine: 'underline' },
  nothingLogged: {
    ...textStyle('legal'),
    color: colors.ink40,
    marginTop: 'auto',
    paddingTop: spacing.xxl,
    textAlign: 'center',
  },
});
