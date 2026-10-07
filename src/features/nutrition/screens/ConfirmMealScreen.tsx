import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Screen } from '@/shared/components/Screen';
import { SelectableChip } from '@/shared/components/SelectableChip';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  confirmMealSchema,
  confirmPrefillSchema,
  confirmRouteParamsSchema,
} from '@/features/nutrition/schemas';
import { todayISO, useCreateFoodEntryMutation } from '@/features/nutrition/api/nutritionApi';
import type { FoodSource, MealType } from '@/shared/types/food';

/** All fields are held as strings while editing (so decimals type cleanly); the schema coerces
 * them to numbers on submit — architecture.md §3 keeps the Zod schema as the single validator. */
type FormState = {
  food_name: string;
  meal_type: MealType;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

const MEAL_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const NUMERIC_FIELDS: { key: keyof FormState; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

function currentMealByClock(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/** Parse the optional `prefill` route param; a malformed blob starts the form blank, not a crash. */
function parsePrefill(raw?: string): ReturnType<typeof confirmPrefillSchema.parse> | null {
  if (!raw) return null;
  try {
    return confirmPrefillSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * "Check my math" (15a) — the single confirm/edit funnel every logging path (search/manual/photo/
 * barcode) flows into before an entry is committed. Aggregate edit only (one name + total macros),
 * matching what `POST /food/photo/` and `POST /food/entries/` actually carry — the design's
 * per-ingredient breakdown needs a backend change (design spec F-N2), not faked here.
 */
export default function ConfirmMealScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ source?: string; prefill?: string }>();
  const params = confirmRouteParamsSchema.parse({
    source: rawParams.source,
    prefill: rawParams.prefill,
  });
  const source = params.source as FoodSource;

  const prefill = parsePrefill(params.prefill);

  const { control, handleSubmit, setError, formState } = useForm<FormState>({
    defaultValues: {
      food_name: prefill?.food_name ?? '',
      meal_type: prefill?.meal_type ?? currentMealByClock(),
      calories: prefill?.calories != null ? String(prefill.calories) : '',
      protein_g: prefill?.protein_g != null ? String(prefill.protein_g) : '',
      carbs_g: prefill?.carbs_g != null ? String(prefill.carbs_g) : '',
      fat_g: prefill?.fat_g != null ? String(prefill.fat_g) : '',
    },
  });

  const createEntry = useCreateFoodEntryMutation(todayISO());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = (values: FormState) => {
    setSubmitError(null);
    const parsed = confirmMealSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string')
          setError(field as keyof FormState, { message: issue.message });
      }
      return;
    }
    createEntry.mutate(
      { ...parsed.data, source },
      {
        onSuccess: () => router.back(),
        onError: () => setSubmitError("That didn't save — check your connection and try again."),
      },
    );
  };

  const headline = source === 'photo' ? "Here's what I saw. Check my math." : 'Check my math.';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.zenith, colors.day, colors.air]}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent">
        <Text style={styles.eyebrow}>Logged · {MEAL_LABEL[currentMealByClock()]}</Text>
        <Text style={styles.title}>{headline}</Text>

        <Controller
          control={control}
          name="food_name"
          render={({ field }) => (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>What was it</Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="e.g. Rice bowl with paneer"
                placeholderTextColor={colors.ink40}
                style={styles.textField}
              />
              {formState.errors.food_name ? (
                <Text style={styles.errorText}>{formState.errors.food_name.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="meal_type"
          render={({ field }) => (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Which meal</Text>
              <View style={styles.chipRow}>
                {MEAL_OPTIONS.map((meal) => (
                  <SelectableChip
                    key={meal}
                    label={MEAL_LABEL[meal]}
                    selected={field.value === meal}
                    onPress={() => field.onChange(meal)}
                  />
                ))}
              </View>
            </View>
          )}
        />

        <View style={styles.macroGrid}>
          {NUMERIC_FIELDS.map(({ key, label, unit }) => (
            <Controller
              key={key}
              control={control}
              name={key}
              render={({ field }) => (
                <View style={styles.macroField}>
                  <Text style={styles.fieldLabel}>
                    {label} <Text style={styles.unit}>({unit})</Text>
                  </Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.ink40}
                    style={styles.textField}
                  />
                  {formState.errors[key] ? (
                    <Text style={styles.errorText}>{formState.errors[key]?.message}</Text>
                  ) : null}
                </View>
              )}
            />
          ))}
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={createEntry.isPending}
          accessibilityRole="button"
          accessibilityLabel="Looks right — log it"
          style={styles.primaryWrap}
        >
          <LinearGradient
            colors={[colors.coreBlue, colors.coreBlueDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.primary, createEntry.isPending && styles.primaryDisabled]}
          >
            {createEntry.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryText}>Looks right</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Not now</Text>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyle('questionTitle'),
    color: colors.ink,
    marginBottom: spacing.xxl,
  },
  fieldBlock: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...textStyle('label'),
    color: colors.label,
  },
  unit: {
    ...textStyle('caption'),
    color: colors.ink40,
  },
  textField: {
    ...textStyle('bodyLg'),
    color: colors.ink,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  macroField: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing.sm,
  },
  errorText: {
    ...textStyle('caption'),
    color: colors.attention,
  },
  primaryWrap: {
    marginTop: spacing.sm,
  },
  primary: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    ...textStyle('bodyLg'),
    color: colors.white,
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  cancelText: {
    ...textStyle('body'),
    color: colors.ink45,
  },
});
