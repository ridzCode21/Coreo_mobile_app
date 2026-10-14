import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { resetDistance } from '@/features/nutrition/lib/quotaError';
import { REGENERATE_REASONS } from '@/features/nutrition/lib/regenerateReasons';
import { GlassCard } from '@/shared/components/GlassCard';
import { SelectableChip } from '@/shared/components/SelectableChip';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { BudgetTier, CookingFrequency } from '@/shared/types/dietProfile';
import type { QuotaExceededError, RegenerationReason } from '@/shared/types/mealPlan';

const BUDGETS: { label: string; value: BudgetTier }[] = [
  { label: 'Budget-friendly', value: 'budget_friendly' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Premium', value: 'premium' },
];

const COOKING: { label: string; value: CookingFrequency }[] = [
  { label: 'Barely any', value: 'minimal_cooking' },
  { label: 'Something simple', value: 'once_daily' },
  { label: 'I actually like cooking', value: 'every_meal' },
];

const REASON_PICKER_TITLE = "What's not working today?";

type ContextAsk = 'budget' | 'cooking' | null;

type RegenerateSheetProps = {
  visible: boolean;
  reason: RegenerationReason;
  contextAsk: ContextAsk;
  budget: BudgetTier;
  cooking: CookingFrequency;
  saving: boolean;
  quotaError: QuotaExceededError | null;
  onReason: (value: RegenerationReason) => void;
  onBudget: (value: BudgetTier) => void;
  onCooking: (value: CookingFrequency) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function RegenerateSheet({
  visible,
  reason,
  contextAsk,
  budget,
  cooking,
  saving,
  quotaError,
  onReason,
  onBudget,
  onCooking,
  onClose,
  onSubmit,
}: RegenerateSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close regenerate plan"
      />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          {quotaError ? (
            <QuotaReached error={quotaError} onClose={onClose} />
          ) : (
            <RegenerateForm
              reason={reason}
              contextAsk={contextAsk}
              budget={budget}
              cooking={cooking}
              saving={saving}
              onReason={onReason}
              onBudget={onBudget}
              onCooking={onCooking}
              onSubmit={onSubmit}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

type RegenerateFormProps = Omit<RegenerateSheetProps, 'visible' | 'quotaError' | 'onClose'>;

function RegenerateForm({
  reason,
  contextAsk,
  budget,
  cooking,
  saving,
  onReason,
  onBudget,
  onCooking,
  onSubmit,
}: RegenerateFormProps) {
  const isContextAsk = contextAsk !== null;
  const { title, options } = (() => {
    switch (contextAsk) {
      case 'budget':
        return {
          title: "What's the food budget like?",
          options: BUDGETS.map((item) => ({
            ...item,
            selected: budget === item.value,
            onSelect: () => onBudget(item.value),
          })),
        };
      case 'cooking':
        return {
          title: 'How much cooking feels doable most days?',
          options: COOKING.map((item) => ({
            ...item,
            selected: cooking === item.value,
            onSelect: () => onCooking(item.value),
          })),
        };
      default:
        return {
          title: REASON_PICKER_TITLE,
          options: REGENERATE_REASONS.map((item) => ({
            ...item,
            selected: reason === item.value,
            onSelect: () => onReason(item.value),
          })),
        };
    }
  })();

  return (
    <>
      <View style={styles.grabber} />
      {isContextAsk ? <Text style={styles.eyebrow}>Just one quick thing</Text> : null}
      <Text style={[styles.sheetTitle, isContextAsk && styles.contextTitle]}>{title}</Text>
      {!isContextAsk ? (
        <Text style={styles.sheetBody}>Pick one — I&apos;ll rebuild around it.</Text>
      ) : null}
      <View style={[styles.chips, isContextAsk && styles.contextChips]}>
        {options.map((item) => (
          <SelectableChip
            key={item.value}
            label={item.label}
            selected={item.selected}
            onPress={item.onSelect}
            variant="sheet"
          />
        ))}
      </View>
      {isContextAsk ? (
        <Text style={styles.contextNote}>
          This makes future plans fit better. I won&apos;t ask again.
        </Text>
      ) : null}
      <Pressable
        onPress={onSubmit}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={isContextAsk ? 'Continue' : 'Regenerate plan'}
        style={styles.sheetPrimary}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.sheetPrimaryText}>
            {isContextAsk ? 'Continue' : 'Regenerate plan'}
          </Text>
        )}
      </Pressable>
    </>
  );
}

function QuotaReached({ error, onClose }: { error: QuotaExceededError; onClose: () => void }) {
  return (
    <>
      <View style={styles.dimmedReasonPicker} pointerEvents="none">
        <View style={styles.grabber} />
        <Text style={styles.dimmedTitle}>{REASON_PICKER_TITLE}</Text>
        <View style={styles.dimmedChips}>
          {REGENERATE_REASONS.slice(0, 2).map((item) => (
            <Text key={item.value} style={styles.dimmedChip}>
              {item.label}
            </Text>
          ))}
        </View>
      </View>
      <GlassCard variant="night" radius={radii.quotaCard} style={styles.quotaCard}>
        <Text style={styles.quotaLabel}>Today&apos;s regenerates are spent</Text>
        <Text style={styles.quotaBody}>
          You&apos;ve used all {error.limit} for today. More unlock in{' '}
          {resetDistance(error.quota_resets_at)} — today&apos;s plan still stands, and it&apos;s a
          good one.
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Keep today's plan"
          style={styles.keepButton}
        >
          <Text style={styles.keepButtonText}>Keep today&apos;s plan</Text>
        </Pressable>
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(colors.overlayInk, 0.35),
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.zenith,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  grabber: {
    alignSelf: 'center',
    width: componentSizes.sheetGrabberWidth,
    height: componentSizes.sheetGrabberHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink40,
    marginBottom: spacing.lg,
  },
  eyebrow: { ...textStyle('label'), color: colors.ink45 },
  sheetTitle: { ...textStyle('sheetTitle'), color: colors.ink },
  contextTitle: { marginTop: spacing.lg },
  sheetBody: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink55,
    marginTop: spacing.sheetSubtitleGap,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  contextChips: { flexDirection: 'column', marginTop: spacing.xxl },
  contextNote: {
    ...textStyle('legal'),
    color: colors.ink45,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  sheetPrimary: {
    minHeight: componentSizes.sheetControlHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.ml,
  },
  sheetPrimaryText: { ...textStyle('buttonSm'), color: colors.white },
  dimmedReasonPicker: { opacity: 0.5 },
  dimmedTitle: { ...textStyle('cardTitle'), color: colors.ink },
  dimmedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.ml },
  dimmedChip: {
    ...textStyle('small'),
    color: colors.ink,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.5),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  quotaCard: { marginTop: spacing.md },
  quotaLabel: { ...textStyle('label'), color: withAlpha(colors.onNight, 0.55) },
  quotaBody: { ...textStyle('quotaMessage'), color: colors.onNight, marginTop: spacing.ms },
  keepButton: {
    minHeight: componentSizes.sheetControlHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sheetTitleGap,
  },
  keepButtonText: { ...textStyle('buttonSm'), color: colors.ink },
});
