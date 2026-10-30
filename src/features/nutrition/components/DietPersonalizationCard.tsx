import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { SliderRow } from '@/shared/components/SliderRow';
import { ToggleRow } from '@/shared/components/ToggleRow';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  profileChecklist,
  profileCompletion,
  useUpdateDietProfileMutation,
  type ProfileChecklistItem,
  type ProfileCompletionSection,
} from '@/features/onboarding';
import type {
  ActivityLevel,
  BudgetTier,
  CuisinePreference,
  DietProfile,
  DietProfilePatch,
  DietType,
  HealthCondition,
  MealRhythm,
  Pace,
  WeakMoment,
  WhoCooks,
} from '@/shared/types/dietProfile';

const DIET_OPTIONS: { label: string; value: DietType }[] = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Everything', value: 'everything' },
  { label: 'No beef', value: 'no_beef' },
  { label: 'Halal', value: 'halal' },
  { label: 'Eggs are fine', value: 'eggetarian' },
  { label: 'Pescatarian', value: 'pescatarian' },
  { label: 'Jain', value: 'jain' },
  { label: 'No pork', value: 'no_pork' },
];

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: 'Mostly sitting', value: 'sedentary' },
  { label: 'Lightly active', value: 'light' },
  { label: 'Moderately active', value: 'moderate' },
  { label: 'Very active', value: 'active' },
  { label: 'Athlete level', value: 'very_active' },
];

const ALLERGY_OPTIONS = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Soy'];

const CUISINE_OPTIONS: { label: string; value: CuisinePreference }[] = [
  { label: 'Indian', value: 'indian' },
  { label: 'South Indian', value: 'south_indian' },
  { label: 'North Indian', value: 'north_indian' },
  { label: 'Mediterranean', value: 'mediterranean' },
  { label: 'Surprise me', value: 'any' },
];

const WHO_COOKS_OPTIONS: { label: string; value: WhoCooks }[] = [
  { label: 'I cook', value: 'i_cook' },
  { label: 'Family cooks', value: 'family_cooks' },
  { label: 'House help', value: 'house_help' },
  { label: 'Mostly order in', value: 'mostly_order_in' },
  { label: 'Office canteen', value: 'office_canteen' },
];

const MEAL_RHYTHM_OPTIONS: { label: string; value: MealRhythm }[] = [
  { label: 'Two big meals', value: 'two_big_meals' },
  { label: 'Three meals', value: 'three_meals' },
  { label: 'Three plus snacks', value: 'three_plus_snacks' },
  { label: 'Grazing all day', value: 'grazing' },
  { label: 'No pattern', value: 'no_pattern' },
];

const PACE_OPTIONS: { label: string; value: Pace }[] = [
  { label: 'Gently', value: 'gently' },
  { label: 'Steady', value: 'steady' },
  { label: 'Push me', value: 'push' },
];

const WEAK_MOMENT_OPTIONS: { label: string; value: WeakMoment }[] = [
  { label: 'Skipping meals', value: 'skipping_meals' },
  { label: 'Late-night snacks', value: 'late_night_snacks' },
  { label: 'Ordering out', value: 'ordering_out' },
  { label: 'Stress eating', value: 'stress_eating' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Sugar', value: 'sugar' },
];

const BUDGET_OPTIONS: { label: string; value: BudgetTier }[] = [
  { label: 'Budget-friendly', value: 'budget_friendly' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Whatever it takes', value: 'premium' },
];

const HEALTH_OPTIONS: { label: string; value: HealthCondition }[] = [
  { label: 'Diabetes', value: 'diabetes' },
  { label: 'PCOS', value: 'pcos' },
  { label: 'Thyroid', value: 'thyroid' },
  { label: 'Heart health', value: 'heart_health' },
  { label: 'High blood pressure', value: 'high_bp' },
  { label: 'GLP-1 medication', value: 'glp_1' },
  { label: 'None of these', value: 'none' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

type EditableSection = Exclude<ProfileCompletionSection, 'goal' | 'body'>;

type DietPersonalizationCardProps = {
  profile: DietProfile;
};

export const DIET_QUICK_SETUP_SUBTITLE = 'Diet type · Activity · Foods to avoid';

function toggleString(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

function editableMissing(items: ProfileChecklistItem[]): ProfileChecklistItem[] {
  return items.filter((item) => !item.done && item.id !== 'goal' && item.id !== 'body');
}

export function DietPersonalizationCard({ profile }: DietPersonalizationCardProps) {
  const dismissedQuick = useAppFlagsStore((state) => state.dismissedDietQuickSetup);
  const dismissQuick = useAppFlagsStore((state) => state.dismissDietQuickSetup);
  const visitedSections = useAppFlagsStore((state) => state.visitedProfileSections);
  const markVisited = useAppFlagsStore((state) => state.markProfileSectionVisited);
  const updateProfile = useUpdateDietProfileMutation();

  const completion = profileCompletion(profile);
  const [quickOpen, setQuickOpen] = useState(!completion.dietQuick && !dismissedQuick);
  const [quickDiet, setQuickDiet] = useState<DietType | null>(profile.diet_type);
  const [quickActivity, setQuickActivity] = useState<ActivityLevel | null>(profile.activity_level);
  const [quickAllergies, setQuickAllergies] = useState<string[]>(profile.allergies);
  const [quickNoAllergies, setQuickNoAllergies] = useState(
    Boolean(visitedSections.allergies && profile.allergies.length === 0),
  );
  const [editing, setEditing] = useState<EditableSection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);

  const checklist = profileChecklist(profile, visitedSections);
  const missing = editableMissing(checklist);
  const nextMissing = missing[0];
  const canSaveQuick = Boolean(
    quickDiet && quickActivity && (quickNoAllergies || quickAllergies.length > 0),
  );

  const submitQuick = () => {
    if (!quickDiet || !quickActivity) return;
    updateProfile.mutate(
      {
        diet_type: quickDiet,
        activity_level: quickActivity,
        allergies: quickNoAllergies ? [] : quickAllergies,
      },
      {
        onSuccess: () => {
          void markVisited('allergies');
          setQuickOpen(false);
        },
      },
    );
  };

  const startEdit = (section: EditableSection) => {
    setEditing(section);
    if (section === 'dietType') setSelected(profile.diet_type ? [profile.diet_type] : []);
    if (section === 'activity') setSelected(profile.activity_level ? [profile.activity_level] : []);
    if (section === 'allergies')
      setSelected(profile.allergies.length > 0 ? profile.allergies : ['none']);
    if (section === 'cuisine')
      setSelected(profile.cuisine_preference ? [profile.cuisine_preference] : []);
    if (section === 'cooking') setSelected(profile.who_cooks ? [profile.who_cooks] : []);
    if (section === 'mealRhythm') setSelected(profile.meal_rhythm ? [profile.meal_rhythm] : []);
    if (section === 'target') {
      const currentWeight = Math.round(profile.weight_kg ?? 0);
      setTargetWeight(profile.target_weight_kg ?? Math.max(30, currentWeight - 6));
      setPace(profile.pace ?? 'steady');
    }
    if (section === 'weakMoment') setSelected(profile.weak_moment ? [profile.weak_moment] : []);
    if (section === 'budget') setSelected(profile.budget_tier ? [profile.budget_tier] : []);
    if (section === 'health') setSelected(profile.health_conditions);
  };

  const closeEdit = () => {
    setEditing(null);
    setSelected([]);
    setTargetWeight(null);
    setPace(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    const patch = buildPatch(editing, selected, targetWeight, pace);
    updateProfile.mutate(patch, {
      onSuccess: () => {
        void markVisited(editing);
        closeEdit();
      },
    });
  };

  if (!completion.dietQuick && quickOpen) {
    return (
      <GlassCard variant="light" radius={radii.xl} style={styles.card}>
        <Text style={styles.cardLabel}>Personalize your diet</Text>
        <Text style={styles.title}>
          3 quick things to improve your targets and future meal plans.
        </Text>
        <Text style={styles.body}>{DIET_QUICK_SETUP_SUBTITLE}</Text>

        <Question title="How do you eat?">
          <View style={styles.chips}>
            {DIET_OPTIONS.map((option) => (
              <SelectableChip
                key={option.value}
                label={option.label}
                selected={quickDiet === option.value}
                onPress={() => setQuickDiet(option.value)}
              />
            ))}
          </View>
        </Question>

        <Question title="How active are you?">
          <View style={styles.stack}>
            {ACTIVITY_OPTIONS.map((option) => (
              <ToggleRow
                key={option.value}
                title={option.label}
                selected={quickActivity === option.value}
                onPress={() => setQuickActivity(option.value)}
                selectionMode="radio"
                minHeight={56}
                titleFontSize={14}
              />
            ))}
          </View>
        </Question>

        <Question title="Anything your body refuses? I never suggest what hurts you.">
          <View style={styles.chips}>
            {ALLERGY_OPTIONS.map((option) => {
              const value = option.toLowerCase();
              return (
                <SelectableChip
                  key={value}
                  label={option}
                  selected={quickAllergies.includes(value)}
                  onPress={() => {
                    setQuickNoAllergies(false);
                    setQuickAllergies((current) => toggleString(current, value));
                  }}
                />
              );
            })}
            <SelectableChip
              label="Nothing"
              selected={quickNoAllergies}
              onPress={() => {
                setQuickNoAllergies(true);
                setQuickAllergies([]);
              }}
            />
          </View>
        </Question>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => {
              void dismissQuick();
              setQuickOpen(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip diet setup for now"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Not now</Text>
          </Pressable>
          <Pressable
            onPress={submitQuick}
            disabled={!canSaveQuick || updateProfile.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save diet setup"
            style={[
              styles.primaryButton,
              (!canSaveQuick || updateProfile.isPending) && styles.disabled,
            ]}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>Save</Text>
            )}
          </Pressable>
        </View>
      </GlassCard>
    );
  }

  return (
    <>
      {!completion.dietQuick ? (
        <Pressable
          onPress={() => setQuickOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open quick diet setup"
        >
          <GlassCard variant="light" radius={radii.xl} style={styles.card}>
            <Text style={styles.cardLabel}>Personalize your diet</Text>
            <Text style={styles.title}>
              3 quick things to improve your targets and future meal plans.
            </Text>
            <Text style={styles.body}>{DIET_QUICK_SETUP_SUBTITLE}</Text>
            <Text style={styles.inlineAction}>Finish in ~1 min</Text>
          </GlassCard>
        </Pressable>
      ) : null}

      {completion.dietQuick && nextMissing ? (
        <Pressable
          onPress={() => startEdit(nextMissing.id as EditableSection)}
          accessibilityRole="button"
          accessibilityLabel="Improve recommendations"
          style={styles.improveRow}
        >
          <View style={styles.improveCopy}>
            <Text style={styles.cardLabel}>Improve recommendations</Text>
            <Text style={styles.body}>
              {missing.length} useful detail{missing.length === 1 ? '' : 's'} still missing
            </Text>
            <Text style={styles.detailLine}>
              {missing
                .slice(0, 2)
                .map((item) => item.label)
                .join(', ')}
            </Text>
          </View>
          <Text style={styles.inlineAction}>Personalize</Text>
        </Pressable>
      ) : null}

      <EditSheet
        section={editing}
        selected={selected}
        setSelected={setSelected}
        onSave={saveEdit}
        onClose={closeEdit}
        saving={updateProfile.isPending}
        targetWeight={targetWeight}
        setTargetWeight={setTargetWeight}
        pace={pace}
        setPace={setPace}
        currentWeight={Math.round(profile.weight_kg ?? 0)}
      />
    </>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function buildPatch(
  section: EditableSection,
  selected: string[],
  targetWeight: number | null,
  pace: Pace | null,
): DietProfilePatch {
  const first = selected[0];
  if (section === 'dietType') return { diet_type: (first as DietType | undefined) ?? null };
  if (section === 'activity')
    return { activity_level: (first as ActivityLevel | undefined) ?? null };
  if (section === 'allergies') return { allergies: selected.includes('none') ? [] : selected };
  if (section === 'cuisine')
    return { cuisine_preference: (first as CuisinePreference | undefined) ?? null };
  if (section === 'target') return { target_weight_kg: targetWeight, pace };
  if (section === 'cooking') return { who_cooks: (first as WhoCooks | undefined) ?? null };
  if (section === 'mealRhythm') return { meal_rhythm: (first as MealRhythm | undefined) ?? null };
  if (section === 'budget') return { budget_tier: (first as BudgetTier | undefined) ?? null };
  if (section === 'weakMoment') return { weak_moment: (first as WeakMoment | undefined) ?? null };
  return { health_conditions: selected as HealthCondition[] };
}

type SectionConfig = {
  title?: string;
  options?: { label: string; value: string }[];
  subtitle?: string;
  buttonLabel?: string;
  layout?: 'chips';
  multi?: boolean;
  required?: boolean;
};

const SECTION_CONFIG: Record<EditableSection, SectionConfig> = {
  dietType: { title: 'How do you eat?', options: DIET_OPTIONS, layout: 'chips', required: true },
  activity: { title: 'How active are you?', options: ACTIVITY_OPTIONS },
  allergies: {
    title: 'Anything your body refuses? I never suggest what hurts you.',
    options: [
      ...ALLERGY_OPTIONS.map((label) => ({ label, value: label.toLowerCase() })),
      { label: 'Nothing', value: 'none' },
    ],
    layout: 'chips',
    multi: true,
  },
  target: {},
  cuisine: { title: 'What flavours feel like home?', options: CUISINE_OPTIONS },
  cooking: {
    title: 'Who makes your food most days?',
    options: WHO_COOKS_OPTIONS,
    subtitle: 'The plan bends to whoever is at the stove, not the other way.',
    buttonLabel: 'Next',
    layout: 'chips',
    required: true,
  },
  mealRhythm: {
    title: 'How does a normal day of eating flow?',
    options: MEAL_RHYTHM_OPTIONS,
    subtitle: 'Meal timing shapes the plan more than calorie math does.',
    buttonLabel: 'Next',
    layout: 'chips',
    required: true,
  },
  budget: { title: "What's the food budget like?", options: BUDGET_OPTIONS },
  health: { title: 'Anything I should plan around?', options: HEALTH_OPTIONS, multi: true },
  weakMoment: {
    title: "Last one. When do you slip? I'll guard that hour with you.",
    options: WEAK_MOMENT_OPTIONS,
    buttonLabel: 'Build my fuel plan',
    layout: 'chips',
    required: true,
  },
};

function EditSheet({
  section,
  selected,
  setSelected,
  onSave,
  onClose,
  saving,
  targetWeight,
  setTargetWeight,
  pace,
  setPace,
  currentWeight,
}: {
  section: EditableSection | null;
  selected: string[];
  setSelected: (next: string[] | ((current: string[]) => string[])) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  targetWeight: number | null;
  setTargetWeight: (value: number | null) => void;
  pace: Pace | null;
  setPace: (value: Pace | null) => void;
  currentWeight: number;
}) {
  const config = section ? SECTION_CONFIG[section] : null;
  const multi = Boolean(config?.multi);
  const subtitle = config?.subtitle;
  const buttonLabel =
    section === 'target' && targetWeight !== null && pace !== null
      ? `${targetWeight}, ${PACE_OPTIONS.find((option) => option.value === pace)?.label.toLowerCase()}`
      : (config?.buttonLabel ?? 'Save');
  const targetMin = Math.max(30, currentWeight - 13);
  const requiresSelection = Boolean(config?.required);
  const canSave =
    (section !== 'target' || (targetWeight !== null && pace !== null)) &&
    (!requiresSelection || selected.length > 0);
  return (
    <Modal visible={section !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close edit sheet" />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>
            {section === 'target'
              ? `You're at ${currentWeight} kg. Where are we taking it?`
              : (config?.title ?? '')}
          </Text>
          {section === 'target' && targetWeight !== null ? (
            <>
              <SliderRow
                value={targetWeight}
                min={targetMin}
                max={currentWeight}
                unit="kg"
                displayVariant="targetWeight"
                minLabel={`${targetMin}`}
                maxLabel={`${currentWeight} now`}
                onChange={setTargetWeight}
              />
              <View style={styles.chips}>
                {PACE_OPTIONS.map((option) => (
                  <SelectableChip
                    key={option.value}
                    label={option.label}
                    selected={pace === option.value}
                    onPress={() => setPace(option.value)}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={config?.layout === 'chips' ? styles.chips : styles.stack}>
              {(config?.options ?? []).map((option) => {
                const active = selected.includes(option.value);
                const onPress = () => {
                  if (!multi) {
                    setSelected([option.value]);
                    return;
                  }
                  if (option.value === 'none' || option.value === 'prefer_not_to_say') {
                    setSelected(active ? [] : [option.value]);
                    return;
                  }
                  setSelected((current) =>
                    toggleString(
                      current.filter((entry) => entry !== 'none' && entry !== 'prefer_not_to_say'),
                      option.value,
                    ),
                  );
                };
                return config?.layout === 'chips' ? (
                  <SelectableChip
                    key={option.value}
                    label={option.label}
                    selected={active}
                    onPress={onPress}
                  />
                ) : (
                  <ToggleRow
                    key={option.value}
                    title={option.label}
                    selected={active}
                    selectionMode={multi ? 'check' : 'radio'}
                    minHeight={56}
                    titleFontSize={14}
                    onPress={onPress}
                  />
                );
              })}
            </View>
          )}
          {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
          <Pressable
            onPress={onSave}
            disabled={saving || !canSave}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            style={[styles.primaryButton, (saving || !canSave) && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>{buttonLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  cardLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  title: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    marginTop: spacing.xs,
  },
  body: {
    ...textStyle('bodySm'),
    color: colors.ink62,
    marginTop: spacing.xs,
  },
  inlineAction: {
    ...textStyle('caption'),
    color: colors.ink,
    marginTop: spacing.md,
  },
  question: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  questionTitle: {
    ...textStyle('label'),
    color: colors.label,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...textStyle('body'),
    color: colors.ink62,
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...textStyle('body'),
    color: colors.white,
  },
  disabled: {
    opacity: 0.58,
  },
  improveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  improveCopy: {
    flex: 1,
  },
  detailLine: {
    ...textStyle('caption'),
    color: colors.ink62,
    marginTop: spacing.xs,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18,42,70,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.zenith,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.ink40,
  },
  sheetTitle: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
  },
});
