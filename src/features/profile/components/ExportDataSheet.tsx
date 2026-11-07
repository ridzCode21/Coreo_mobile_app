import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  exportDataSheetCopy,
  type ExportDataSheetState,
} from '@/features/profile/lib/exportDataSheetCopy';
import { MealSheetSkyFrame } from '@/shared/components/MealSheetSkyFrame';
import { MealSheetSubmitButton } from '@/shared/components/MealSheetSubmitButton';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type ExportDataSheetProps = {
  visible: boolean;
  state: ExportDataSheetState;
  onClose: () => void;
  onRetry: () => void;
  onDownload: () => void;
};

function StatusIcon({ state }: { state: ExportDataSheetState }) {
  switch (state.kind) {
    case 'working':
      return <ActivityIndicator color={colors.ink55} accessibilityLabel="Preparing export" />;
    case 'done':
      return (
        <Svg
          width={componentSizes.mealReviewCheckIcon}
          height={componentSizes.mealReviewCheckIcon}
          viewBox="0 0 16 16"
        >
          <Path
            d="M3 8.5 6.25 11.5 13 4.5"
            fill="none"
            stroke={colors.success}
            strokeWidth={componentSizes.savedCheckStroke}
          />
        </Svg>
      );
    case 'failed':
      return (
        <Svg
          width={componentSizes.mealReviewCheckIcon}
          height={componentSizes.mealReviewCheckIcon}
          viewBox="0 0 16 16"
        >
          <Circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke={colors.attention}
            strokeWidth={componentSizes.savedCheckStroke}
          />
          <Path
            d="M8 3v5"
            fill="none"
            stroke={colors.attention}
            strokeWidth={componentSizes.savedCheckStroke}
          />
          <Path
            d="M8 11.5h.01"
            fill="none"
            stroke={colors.attention}
            strokeWidth={componentSizes.savedCheckStroke}
          />
        </Svg>
      );
    case 'offline':
      return null;
  }
}

export function ExportDataSheet({
  visible,
  state,
  onClose,
  onRetry,
  onDownload,
}: ExportDataSheetProps) {
  const copy = exportDataSheetCopy(state);
  const isDone = state.kind === 'done';
  const isFailed = state.kind === 'failed';

  return (
    <MealSheetSkyFrame
      visible={visible}
      title={copy.title}
      subtitle={copy.subtitle}
      onClose={onClose}
    >
      <View style={[styles.statusRow, isDone && styles.doneRow, isFailed && styles.failedRow]}>
        <StatusIcon state={state} />
        <Text style={[styles.statusText, isDone && styles.doneStatusText]}>{copy.statusText}</Text>
        {copy.retryLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.retryLabel}
            onPress={onRetry}
          >
            <Text style={styles.retryText}>{copy.retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <MealSheetSubmitButton
        label={copy.primaryLabel}
        busy={false}
        disabled={!copy.primaryEnabled}
        onPress={onDownload}
      />
      <LinearGradient
        colors={glass.signOutSheetSecondary.gradient}
        start={glass.signOutSheetSecondary.start}
        end={glass.signOutSheetSecondary.end}
        style={styles.secondary}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.secondaryLabel}
          onPress={onClose}
          style={styles.secondaryPressable}
        >
          <Text style={styles.secondaryText}>{copy.secondaryLabel}</Text>
        </Pressable>
      </LinearGradient>
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.4),
    borderColor: withAlpha(colors.white, 0.5),
    borderRadius: radii.afterSnapMacro,
    borderWidth: componentSizes.hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    minHeight: componentSizes.sheetControlHeight,
    paddingHorizontal: spacing.ml,
    paddingVertical: spacing.sm,
  },
  doneRow: {
    backgroundColor: withAlpha(colors.success, 0.12),
    borderColor: withAlpha(colors.success, 0.25),
  },
  failedRow: {
    backgroundColor: withAlpha(colors.attention, 0.08),
    borderColor: withAlpha(colors.attention, 0.2),
  },
  statusText: { ...textStyle('bodySm'), color: colors.ink65, flexShrink: 1 },
  doneStatusText: { color: colors.ink75 },
  retryText: { ...textStyle('bodySm'), color: colors.attention, textDecorationLine: 'underline' },
  secondary: {
    alignItems: 'center',
    borderColor: glass.signOutSheetSecondary.border,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    justifyContent: 'center',
    marginTop: componentSizes.hairline,
    minHeight: componentSizes.sheetControlHeight,
    overflow: 'hidden',
  },
  secondaryPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSizes.sheetControlHeight,
  },
  secondaryText: { ...textStyle('buttonSm'), color: colors.ink },
});
