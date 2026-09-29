import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { SelectableChip } from '@/shared/components/SelectableChip';
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
  CookingFrequency,
  CuisinePreference,
  DietProfile,
  DietProfilePatch,
  DietType,
  HealthCondition,
} from '@/shared/types/dietProfile';

const DIET_OPTIONS: { label: string; value: DietType }[] = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Non-veg', value: 'non_veg' },
  { label: 'Eggs are fine', value: 'eggetarian' },
  { label: 'Jain', value: 'jain' },
  { label: 'Keto', value: 'keto' },
  { label: 'Low carb', value: 'low_carb' },
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

const COOKING_OPTIONS: { label: string; value: CookingFrequency }[] = [
  { label: 'I cook every meal', value: 'every_meal' },
  { label: 'Someone cooks once a day', value: 'once_daily' },
  { label: 'We batch cook', value: 'batch_cooking' },
  { label: 'I barely cook', value: 'minimal_cooking' },
];

const MEAL_OPTIONS = [
  { label: 'Two big meals', value: 2 },
  { label: 'Three meals', value: 3 },
  { label: 'Three plus snacks', value: 4 },
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
    if (section === 'cooking')
      setSelected(profile.cooking_frequency ? [profile.cooking_frequency] : []);
    if (section === 'mealRhythm')
      setSelected(profile.meal_frequency ? [String(profile.meal_frequency)] : []);
    if (section === 'budget') setSelected(profile.budget_tier ? [profile.budget_tier] : []);
    if (section === 'health') setSelected(profile.health_conditions);
  };

  const closeEdit = () => {
    setEditing(null);
    setSelected([]);
  };

  const saveEdit = () => {
    if (!editing) return;
    const patch = buildPatch(editing, selected);
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
        <Text style={styles.body}>Diet type · Activity · Foods to avoid</Text>

        <Question title="How do you usually eat?">
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

        <Question title="Anything we should avoid?">
          <View style={styles.chips}>
            <SelectableChip
              label="No allergies"
              selected={quickNoAllergies}
              onPress={() => {
                setQuickNoAllergies(true);
                setQuickAllergies([]);
              }}
            />
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
            <Text style={styles.body}>Diet type · Activity · Foods to avoid</Text>
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

function buildPatch(section: EditableSection, selected: string[]): DietProfilePatch {
  const first = selected[0];
  if (section === 'dietType') return { diet_type: (first as DietType | undefined) ?? null };
  if (section === 'activity')
    return { activity_level: (first as ActivityLevel | undefined) ?? null };
  if (section === 'allergies') return { allergies: selected.includes('none') ? [] : selected };
  if (section === 'cuisine')
    return { cuisine_preference: (first as CuisinePreference | undefined) ?? null };
  if (section === 'cooking')
    return { cooking_frequency: (first as CookingFrequency | undefined) ?? null };
  if (section === 'mealRhythm') return { meal_frequency: first ? Number(first) : undefined };
  if (section === 'budget') return { budget_tier: (first as BudgetTier | undefined) ?? null };
  return { health_conditions: selected as HealthCondition[] };
}

function optionsForSection(section: EditableSection | null): { label: string; value: string }[] {
  if (section === 'dietType') return DIET_OPTIONS;
  if (section === 'activity') return ACTIVITY_OPTIONS;
  if (section === 'allergies') {
    return [
      { label: 'No allergies', value: 'none' },
      ...ALLERGY_OPTIONS.map((label) => ({ label, value: label.toLowerCase() })),
    ];
  }
  if (section === 'cuisine') return CUISINE_OPTIONS;
  if (section === 'cooking') return COOKING_OPTIONS;
  if (section === 'mealRhythm')
    return MEAL_OPTIONS.map((option) => ({ label: option.label, value: String(option.value) }));
  if (section === 'budget') return BUDGET_OPTIONS;
  if (section === 'health') return HEALTH_OPTIONS;
  return [];
}

function titleForSection(section: EditableSection | null): string {
  if (section === 'dietType') return 'How do you usually eat?';
  if (section === 'activity') return 'How active are you?';
  if (section === 'allergies') return 'Anything we should avoid?';
  if (section === 'cuisine') return 'What flavours feel like home?';
  if (section === 'cooking') return 'Who makes your food most days?';
  if (section === 'mealRhythm') return 'How does a normal day of eating flow?';
  if (section === 'budget') return "What's the food budget like?";
  if (section === 'health') return 'Anything I should plan around?';
  return '';
}

function isMulti(section: EditableSection | null): boolean {
  return section === 'allergies' || section === 'health';
}

function EditSheet({
  section,
  selected,
  setSelected,
  onSave,
  onClose,
  saving,
}: {
  section: EditableSection | null;
  selected: string[];
  setSelected: (next: string[] | ((current: string[]) => string[])) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const multi = isMulti(section);
  return (
    <Modal visible={section !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close edit sheet" />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{titleForSection(section)}</Text>
          <View style={styles.stack}>
            {optionsForSection(section).map((option) => {
              const active = selected.includes(option.value);
              return (
                <ToggleRow
                  key={option.value}
                  title={option.label}
                  selected={active}
                  selectionMode={multi ? 'check' : 'radio'}
                  minHeight={56}
                  titleFontSize={14}
                  onPress={() => {
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
                        current.filter(
                          (entry) => entry !== 'none' && entry !== 'prefer_not_to_say',
                        ),
                        option.value,
                      ),
                    );
                  }}
                />
              );
            })}
          </View>
          <Pressable
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save profile section"
            style={[styles.primaryButton, saving && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>Save</Text>
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
    color: colors.ink60,
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
    color: colors.ink60,
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.coreBlue,
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
    color: colors.ink60,
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
