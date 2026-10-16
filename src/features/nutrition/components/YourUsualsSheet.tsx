import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCreateFoodEntryMutation, useUsualsQuery } from '@/features/nutrition/api/nutritionApi';
import {
  formatUsualsHeadline,
  usualsRowCopy,
  type UsualsSuggestion,
} from '@/features/nutrition/lib/usualsCopy';
import { GlassCard } from '@/shared/components/GlassCard';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { useResponsive } from '@/shared/hooks/useResponsive';
import {
  colors,
  componentSizes,
  glass,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { MealType } from '@/shared/types/food';

type YourUsualsSheetProps = {
  visible: boolean;
  mealType: MealType;
  date: string;
  onClose: () => void;
  onSomethingNew: () => void;
};

function BackIcon() {
  return (
    <Svg
      width={componentSizes.replaceBackIcon}
      height={componentSizes.replaceBackIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.ink80}
        strokeWidth={componentSizes.homeAskBarSendStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AddIcon({ kind, highlighted }: { kind: UsualsSuggestion['kind']; highlighted: boolean }) {
  const stroke = highlighted ? colors.ink : colors.ink75;
  return (
    <Svg
      width={componentSizes.dietActionIcon}
      height={componentSizes.dietActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      {kind === 'repeat' ? (
        <Path
          d="M12 5v14M5 12h14"
          stroke={stroke}
          strokeWidth={componentSizes.homeAskBarSendStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M1 4v6h6M3.5 15a9 9 0 1 0 2-9.5L1 10"
          stroke={stroke}
          strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg
      width={componentSizes.dietActionIcon}
      height={componentSizes.dietActionIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={colors.white}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={13}
        r={4}
        stroke={colors.white}
        strokeWidth={componentSizes.homeAskBarMicStrokeWidth}
      />
    </Svg>
  );
}

function suggestionShadow(highlighted: boolean): ViewStyle {
  return {
    shadowOffset: { width: 0, height: highlighted ? spacing.xl : spacing.md },
    shadowOpacity: 1,
    shadowRadius: highlighted
      ? componentSizes.usualHighlightShadowRadius
      : componentSizes.usualCardShadowRadius,
    elevation: componentSizes.dietElevation,
  };
}

export function YourUsualsSheet({
  visible,
  mealType,
  date,
  onClose,
  onSomethingNew,
}: YourUsualsSheetProps) {
  const { contentMaxWidth } = useResponsive();
  const usuals = useUsualsQuery(mealType);
  const createEntry = useCreateFoodEntryMutation(date);
  const suggestions = usuals.data?.suggestions ?? [];

  // The parent gates opening on this too; keep this guard to avoid empty chrome after cache updates.
  if (suggestions.length === 0) return null;

  const logSuggestion = (suggestion: UsualsSuggestion) => {
    createEntry.mutate(
      {
        food_name: suggestion.food_name,
        meal_type: suggestion.meal_type,
        calories: suggestion.calories,
        protein_g: suggestion.protein_g,
        carbs_g: suggestion.carbs_g,
        fat_g: suggestion.fat_g,
        portion_g: suggestion.portion_g,
        source: 'quick_add',
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <SkyBackground style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
              <View style={styles.header}>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={spacing.xs}
                >
                  <LinearGradient
                    colors={glass.afterSnapNav.gradient}
                    start={glass.afterSnapNav.start}
                    end={glass.afterSnapNav.end}
                    style={styles.backButton}
                  >
                    <BackIcon />
                  </LinearGradient>
                </Pressable>
                <Text style={styles.eyebrow}>Your usuals</Text>
                <View style={styles.headerSpacer} />
              </View>

              <View style={styles.headline}>
                <Text style={styles.headlineLead}>
                  {formatUsualsHeadline(usuals.data?.observed_at ?? '')}{' '}
                </Text>
                <Text style={styles.headlineAccent}>The usual?</Text>
              </View>

              <View style={styles.suggestions}>
                {suggestions.map((suggestion, index) => {
                  const copy = usualsRowCopy(suggestion);
                  const highlighted = index === 0;
                  return (
                    <Pressable
                      key={`${suggestion.kind}-${suggestion.food_name}-${suggestion.last_logged_on}`}
                      onPress={() => logSuggestion(suggestion)}
                      disabled={createEntry.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={`Log ${suggestion.food_name}`}
                    >
                      <GlassCard
                        variant={highlighted ? 'usualHighlight' : 'usualCard'}
                        radius={radii.usualSuggestion}
                        padded={false}
                        style={suggestionShadow(highlighted)}
                      >
                        <View style={styles.suggestionContent}>
                          <View style={styles.suggestionCopy}>
                            <Text
                              style={highlighted ? styles.highlightTitle : styles.suggestionTitle}
                            >
                              {copy.title}
                            </Text>
                            <Text
                              style={
                                highlighted ? styles.highlightSubtitle : styles.suggestionSubtitle
                              }
                            >
                              {copy.subtitle}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.suggestionAction,
                              highlighted ? styles.highlightAction : styles.lightAction,
                            ]}
                          >
                            <AddIcon kind={suggestion.kind} highlighted={highlighted} />
                          </View>
                        </View>
                      </GlassCard>
                    </Pressable>
                  );
                })}
              </View>

              <GlassCard variant="usualNote" radius={radii.md} padded={false} style={styles.note}>
                <Text style={styles.noteText}>
                  I learned these from you. No forms, no &quot;custom foods&quot;. Your repeats just
                  show up.
                </Text>
              </GlassCard>

              <View style={styles.grow} />

              <Pressable
                onPress={onSomethingNew}
                accessibilityRole="button"
                accessibilityLabel="Something new instead"
              >
                <View style={styles.newActionGlow}>
                  <LinearGradient
                    colors={glass.chipSelected.gradient}
                    start={glass.chipSelected.start}
                    end={glass.chipSelected.end}
                    style={styles.newAction}
                  >
                    <Text style={styles.newActionText}>Something new instead</Text>
                    <View style={styles.cameraCircle}>
                      <CameraIcon />
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, paddingVertical: spacing.md },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.screenPadX,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.afterSnapNav.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: glass.afterSnapNav.shadowColor,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45 },
  headerSpacer: { width: componentSizes.dietHeaderControl },
  headline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sheetTitleGap,
  },
  headlineLead: { ...textStyle('sheetTitle'), color: colors.ink },
  headlineAccent: { ...textStyle('dietHeadlineAccent'), color: colors.ink },
  suggestions: { gap: spacing.ms, marginTop: spacing.ml },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ml,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  suggestionCopy: { flex: 1 },
  suggestionTitle: { ...textStyle('usualRowTitle'), color: colors.ink },
  highlightTitle: { ...textStyle('usualRowTitle'), color: colors.onNight },
  suggestionSubtitle: {
    ...textStyle('usualRowSubtitle'),
    color: colors.ink50,
    marginTop: spacing.dockItemGap,
  },
  highlightSubtitle: {
    ...textStyle('usualRowSubtitle'),
    color: colors.usualOnNightMuted,
    marginTop: spacing.dockItemGap,
  },
  suggestionAction: {
    width: componentSizes.dietLogPlus,
    height: componentSizes.dietLogPlus,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightAction: {
    backgroundColor: colors.white,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.dietVoiceSubmitGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  lightAction: {
    backgroundColor: withAlpha(colors.white, 0.8),
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.9),
  },
  note: { marginTop: spacing.md },
  noteText: {
    ...textStyle('usualFooter'),
    color: colors.ink65,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  grow: { flex: 1, minHeight: spacing.xl },
  newActionGlow: {
    borderRadius: radii.dietLogPill,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.dietLogPillGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  newAction: {
    height: componentSizes.dietLogPillHeight,
    borderRadius: radii.dietLogPill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.chipSelected.border,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    shadowColor: glass.chipSelected.shadowColor,
    shadowOffset: { width: 0, height: spacing.lg },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietActionShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  newActionText: { ...textStyle('buttonSm'), color: colors.ink, flex: 1 },
  cameraCircle: {
    width: componentSizes.dietLogPlus,
    height: componentSizes.dietLogPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
});
