import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/shared/components/GlassCard';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { useResponsive } from '@/shared/hooks/useResponsive';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import { useCreateFoodItemMutation } from '@/features/nutrition/api/nutritionApi';
import { addFoodSchema } from '@/features/nutrition/schemas';

type AddFoodFormState = {
  name: string;
  calories_per_100g: string;
  protein_g_per_100g: string;
  carbs_g_per_100g: string;
  fat_g_per_100g: string;
};

const MACRO_FIELDS: {
  key: Exclude<keyof AddFoodFormState, 'name'>;
  label: string;
  unit: string;
}[] = [
  { key: 'calories_per_100g', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g_per_100g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g_per_100g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g_per_100g', label: 'Fat', unit: 'g' },
];

export default function AddFoodScreen() {
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const createFood = useCreateFoodItemMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, getValues, setError, formState } = useForm<AddFoodFormState>({
    defaultValues: {
      name: '',
      calories_per_100g: '',
      protein_g_per_100g: '',
      carbs_g_per_100g: '',
      fat_g_per_100g: '',
    },
  });

  const submit = (values: AddFoodFormState) => {
    setSubmitError(null);
    const parsed = addFoodSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') {
          setError(field as keyof AddFoodFormState, { message: issue.message });
        }
      }
      return;
    }

    createFood.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: () => setSubmitError("I couldn't save that just now. Try again."),
    });
  };

  return (
    <View style={styles.root}>
      <SkyBackground variant="sheet" style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.screenContent}
        >
          <View style={[styles.sheetPosition, { maxWidth: contentMaxWidth }]}>
            <GlassCard variant="sheet" radius={radii.xxl} padded={false}>
              <View style={styles.sheetContent}>
                <View style={styles.grabber} />
                <Text style={styles.title}>Add a food</Text>
                <Text style={styles.subtitle}>
                  Per 100 grams — I&apos;ll scale it wherever you use it.
                </Text>

                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <View>
                      <TextInput
                        testID="add-food-name"
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder="Mom's dal"
                        placeholderTextColor={colors.ink85}
                        accessibilityLabel="Food name"
                        style={styles.nameInput}
                      />
                      {formState.errors.name ? (
                        <Text style={styles.fieldError}>{formState.errors.name.message}</Text>
                      ) : null}
                    </View>
                  )}
                />

                <View style={styles.macroGrid}>
                  {MACRO_FIELDS.map(({ key, label, unit }) => (
                    <Controller
                      key={key}
                      control={control}
                      name={key}
                      render={({ field }) => (
                        <View style={styles.macroField}>
                          <Text style={styles.fieldLabel}>{label}</Text>
                          <View style={styles.valueRow}>
                            <TextInput
                              testID={`add-food-${label.toLowerCase()}`}
                              value={field.value}
                              onChangeText={field.onChange}
                              keyboardType="decimal-pad"
                              accessibilityLabel={`${label} per 100 grams`}
                              style={styles.macroInput}
                            />
                            <Text style={styles.unit}>{unit}</Text>
                          </View>
                          {formState.errors[key] ? (
                            <Text style={styles.fieldError}>{formState.errors[key]?.message}</Text>
                          ) : null}
                        </View>
                      )}
                    />
                  ))}
                </View>

                {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

                <Pressable
                  onPress={() => submit(getValues())}
                  disabled={createFood.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Save to my foods"
                  accessibilityState={{ disabled: createFood.isPending }}
                  style={[styles.saveButton, createFood.isPending && styles.disabled]}
                >
                  {createFood.isPending ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.saveText}>Save to my foods</Text>
                  )}
                </Pressable>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  screenContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheetPosition: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.ml,
    paddingBottom: spacing.xxxl,
  },
  sheetContent: {
    paddingTop: spacing.ml,
    paddingHorizontal: spacing.screenPadXCompact,
    paddingBottom: spacing.screenPadX,
  },
  grabber: {
    alignSelf: 'center',
    width: componentSizes.sheetGrabberWidth,
    height: componentSizes.sheetGrabberHeight,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.ink, 0.18),
  },
  title: { ...textStyle('cardTitle'), color: colors.ink, marginTop: spacing.sheetTitleGap },
  subtitle: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink55,
    marginTop: spacing.sheetSubtitleGap,
  },
  nameInput: {
    ...textStyle('inputValue'),
    color: colors.ink85,
    minHeight: componentSizes.sheetControlHeight,
    backgroundColor: withAlpha(colors.white, 0.55),
    borderColor: withAlpha(colors.white, 0.7),
    borderWidth: componentSizes.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sheetTitleGap,
    marginTop: spacing.lg,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.ms,
  },
  macroField: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: componentSizes.sheetControlHeight,
    backgroundColor: withAlpha(colors.white, 0.55),
    borderColor: withAlpha(colors.white, 0.7),
    borderWidth: componentSizes.hairline,
    borderRadius: radii.afterSnapMacro,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.ml,
  },
  fieldLabel: { ...textStyle('micro'), color: colors.label },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  macroInput: { ...textStyle('usualRowTitle'), color: colors.ink, flex: 1, paddingVertical: 0 },
  unit: { ...textStyle('planKcalUnit'), color: colors.ink50 },
  fieldError: { ...textStyle('fine'), color: colors.attention, marginTop: spacing.xs },
  submitError: {
    ...textStyle('caption'),
    color: colors.attention,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  saveButton: {
    minHeight: componentSizes.authButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sheetTitleGap,
  },
  disabled: { opacity: 0.6 },
  saveText: { ...textStyle('buttonSm'), color: colors.white },
});
