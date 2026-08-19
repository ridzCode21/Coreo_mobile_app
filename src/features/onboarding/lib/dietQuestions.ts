import {
  ACTIVITY_LEVELS,
  BUDGET_TIERS,
  COOKING_FREQUENCIES,
  CUISINE_PREFERENCES,
  DIET_TYPES,
  GOAL_TYPES,
  HEALTH_CONDITIONS,
} from '@/shared/types/dietProfile';
import type {
  DietProfileDraft,
  DietProfileListField,
} from '@/features/onboarding/store/onboardingStore';

export type DietQuestionOption = { label: string; value: string };

type BaseDietQuestion = {
  /** Route segment + step id, e.g. `diet-type` → `(public)/onboarding/diet/diet-type`. */
  id: string;
  /** Design reference for traceability — an existing 12a·N code, or `'added'` for the net-new
   * cuisine/activity/budget/health/goal screens the design doesn't cover (onboarding-v2-flow-plan
   * D4, design-system.md §9-style flag). */
  screenCode: string;
  /** A plain title, or a function of the user's name for the one screen that interpolates it
   * (`goal`, carrying over the original "{name}, tell me what you want to fix." copy). */
  title: string | ((name: string) => string);
  /** Trailing clause rendered in the design's inline-emphasis weight (see
   * `onboardingTitleStyles.emphasis`), matching how the core-setup screens already split titles. */
  titleEmphasis?: string;
  subtitle?: string;
  /** Defaults to "Next" — only screens that diverge from that (D10's "Build my fuel plan") set
   * this. Scalability lever: change copy here, not in a screen file. */
  footerLabel?: string;
};

export type SingleChoiceDietQuestion = BaseDietQuestion & {
  kind: 'single';
  field:
    | 'goal_type'
    | 'diet_type'
    | 'cuisine_preference'
    | 'activity_level'
    | 'cooking_frequency'
    | 'budget_tier'
    | 'meal_frequency';
  options: DietQuestionOption[];
  required?: boolean;
  /** meal_frequency is numeric on the wire — every other single-choice field is a string enum. */
  parseValue?: (raw: string) => number;
};

export type MultiChoiceDietQuestion = BaseDietQuestion & {
  kind: 'multi';
  field: Extract<DietProfileListField, 'allergies' | 'health_conditions'>;
  options: DietQuestionOption[];
  maxSelections?: number;
  /** D2 also captures free-typed dislikes alongside the preset allergy chips. */
  freeAddField?: Extract<DietProfileListField, 'disliked_foods'>;
  freeAddPlaceholder?: string;
};

export type SliderDietQuestion = BaseDietQuestion & {
  kind: 'slider';
  field: 'target_weight_kg';
  unit: string;
  /** Bounds are relative to the draft's own `weightKg` (7a·3), not fixed absolutes — the design's
   * "You're at {weight} kg. Where are we taking it?" framing (D4/12a·3). */
  minOffset: number;
  maxOffset: number;
  step?: number;
};

/** D10/12a·6 — no API field (F3): captured for the assistant later, never sent in the diet PUT. */
export type MockOnlyDietQuestion = BaseDietQuestion & {
  kind: 'mockOnly';
  options: DietQuestionOption[];
};

export type DietQuestion =
  SingleChoiceDietQuestion | MultiChoiceDietQuestion | SliderDietQuestion | MockOnlyDietQuestion;

// Label lookups must be declared before `DIET_QUESTIONS` below — its initializer calls these
// directly at module-eval time (not inside a function), so a `const` declared later in the file
// is still in the temporal dead zone when referenced, throwing "Cannot convert undefined value to
// object" the moment this module loads. Keep everything `DIET_QUESTIONS` reads above it.
export const GOAL_TYPE_LABEL: Record<(typeof GOAL_TYPES)[number], string> = {
  lose_weight: 'Lose weight',
  gain_muscle: 'Build muscle',
  eat_healthier: 'Eat healthier',
  manage_condition: 'Manage a health condition',
  maintain: 'Stay right where I am',
};

const DIET_TYPE_LABEL: Record<(typeof DIET_TYPES)[number], string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  non_veg: 'Non-veg',
  eggetarian: 'Eggs are fine',
  jain: 'Jain',
  keto: 'Keto',
  low_carb: 'Low carb',
};

const CUISINE_LABEL: Record<(typeof CUISINE_PREFERENCES)[number], string> = {
  indian: 'Indian',
  south_indian: 'South Indian',
  north_indian: 'North Indian',
  mediterranean: 'Mediterranean',
  any: 'Surprise me',
};

const ACTIVITY_LABEL: Record<(typeof ACTIVITY_LEVELS)[number], string> = {
  sedentary: 'Mostly sitting',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete level',
};

const COOKING_LABEL: Record<(typeof COOKING_FREQUENCIES)[number], string> = {
  every_meal: 'I cook every meal',
  once_daily: 'Someone cooks once a day',
  batch_cooking: 'We batch cook',
  minimal_cooking: 'I barely cook',
};

const BUDGET_LABEL: Record<(typeof BUDGET_TIERS)[number], string> = {
  budget_friendly: 'Budget-friendly',
  moderate: 'Moderate',
  premium: 'Whatever it takes',
};

const HEALTH_LABEL: Record<(typeof HEALTH_CONDITIONS)[number], string> = {
  diabetes: 'Diabetes',
  pcos: 'PCOS',
  thyroid: 'Thyroid',
  heart_health: 'Heart health',
  high_bp: 'High blood pressure',
  glp_1: 'GLP-1 medication',
  none: 'None of these',
  prefer_not_to_say: 'Prefer not to say',
};

/**
 * The diet interview, declaratively — onboarding-refinement-plan.md Part B3. Add/reorder/remove a
 * question by editing this array; `DietQuestionScreen` (the one generic renderer) and the dynamic
 * `(public)/onboarding/diet/[step].tsx` route read it, so no new screen/route file is needed to
 * change the interview. Order matches the plan's "recommended order".
 */
export const DIET_QUESTIONS: DietQuestion[] = [
  {
    id: 'goal',
    screenCode: 'added',
    kind: 'single',
    field: 'goal_type',
    required: true,
    // Carries over the original 7a·2 "Goals" screen's exact copy/tone (design source) — only the
    // selection behaviour changed, from a lossy motivational multi-select to a direct single-select
    // question that writes `goal_type` straight to the draft (onboarding-v2-flow-plan.md D4/§5).
    title: (name) => `${name || 'Alright'}, tell me what you want to fix.`,
    subtitle: "I'll get you there.",
    options: GOAL_TYPES.map((value) => ({ value, label: GOAL_TYPE_LABEL[value] })),
  },
  {
    id: 'target',
    screenCode: '12a·3',
    kind: 'slider',
    field: 'target_weight_kg',
    unit: 'kg',
    minOffset: -20,
    maxOffset: 10,
    title: 'Where are we taking it?',
    subtitle: "Slide to your target. We'll pace it, not rush it.",
  },
  {
    id: 'activity',
    screenCode: 'added',
    kind: 'single',
    field: 'activity_level',
    title: 'How much do you move on a normal week?',
    options: ACTIVITY_LEVELS.map((value) => ({ value, label: ACTIVITY_LABEL[value] })),
  },
  {
    id: 'diet-type',
    screenCode: '12a·1',
    kind: 'single',
    field: 'diet_type',
    required: true,
    title: 'How do you eat?',
    options: DIET_TYPES.map((value) => ({ value, label: DIET_TYPE_LABEL[value] })),
  },
  {
    id: 'cuisine',
    screenCode: 'added',
    kind: 'single',
    field: 'cuisine_preference',
    required: true,
    title: 'What flavours feel like home?',
    options: CUISINE_PREFERENCES.map((value) => ({ value, label: CUISINE_LABEL[value] })),
  },
  {
    id: 'off-the-table',
    screenCode: '12a·2',
    kind: 'multi',
    field: 'allergies',
    // Free-typed dislikes (`disliked_foods`) removed for now — with the chip grid, this put two
    // stacked glass bars (the free-text `VoiceInputBar` above the `NextBar`) on one screen, which
    // doesn't match the design's one-footer-per-screen chrome. Re-add once there's a design
    // treatment for a screen that needs both a chip grid and free text.
    title: 'Anything your body refuses?',
    subtitle: 'I never suggest what hurts you. Leave this empty if nothing comes to mind.',
    options: [
      { label: 'Peanuts', value: 'peanuts' },
      { label: 'Dairy', value: 'dairy' },
      { label: 'Gluten', value: 'gluten' },
      { label: 'Shellfish', value: 'shellfish' },
      { label: 'Soy', value: 'soy' },
    ],
  },
  {
    id: 'who-cooks',
    screenCode: '12a·4',
    kind: 'single',
    field: 'cooking_frequency',
    title: 'Who makes your food most days?',
    subtitle: 'The plan bends to whoever is at the stove, not the other way.',
    options: COOKING_FREQUENCIES.map((value) => ({ value, label: COOKING_LABEL[value] })),
  },
  {
    id: 'meal-rhythm',
    screenCode: '12a·5',
    kind: 'single',
    field: 'meal_frequency',
    title: 'How does a normal day of eating flow?',
    subtitle: 'Meal timing shapes the plan more than calorie math does.',
    parseValue: (raw) => Number(raw),
    options: [
      { label: 'Two big meals', value: '2' },
      { label: 'Three meals', value: '3' },
      { label: 'Three plus snacks', value: '4' },
    ],
  },
  {
    id: 'budget',
    screenCode: 'added',
    kind: 'single',
    field: 'budget_tier',
    title: "What's the food budget like?",
    options: BUDGET_TIERS.map((value) => ({ value, label: BUDGET_LABEL[value] })),
  },
  {
    id: 'health',
    screenCode: 'added',
    kind: 'multi',
    field: 'health_conditions',
    maxSelections: 3,
    title: 'Anything I should plan around?',
    subtitle: 'Pick up to three. This stays between us.',
    options: HEALTH_CONDITIONS.map((value) => ({ value, label: HEALTH_LABEL[value] })),
  },
  {
    id: 'weak-moment',
    screenCode: '12a·6',
    kind: 'mockOnly',
    title: 'Last one. When do you slip?',
    titleEmphasis: "I'll guard that hour with you.",
    footerLabel: 'Build my fuel plan',
    options: [
      { label: 'Skipping meals', value: 'skipping_meals' },
      { label: 'Late-night snacks', value: 'late_night_snacks' },
      { label: 'Ordering out', value: 'ordering_out' },
      { label: 'Stress eating', value: 'stress_eating' },
      { label: 'Weekends', value: 'weekends' },
      { label: 'Sugar', value: 'sugar' },
    ],
  },
];

/** Config lookup only — sequencing (what comes next, progress dots, conditional visibility like
 * skipping `target` when the goal is `maintain`) is centralized in `lib/steps.ts`'s unified
 * `FLOW_STEPS` (onboarding-v2-flow-plan.md §5 "Unified sequencer"), since diet questions are now
 * interleaved with bespoke screens (about-you, pillars, promise) rather than running as one
 * separate block after them. */
export function getDietQuestion(id: string): DietQuestion | undefined {
  return DIET_QUESTIONS.find((question) => question.id === id);
}

export function dietQuestionTitle(question: DietQuestion, name: string): string {
  return typeof question.title === 'function' ? question.title(name) : question.title;
}

/** Whether a single/slider/multi question's current draft value satisfies `required`. Mock-only
 * and non-required questions are always satisfied (D10, and everything not flagged required). */
export function isDietQuestionAnswered(question: DietQuestion, draft: DietProfileDraft): boolean {
  if (question.kind === 'mockOnly') return true;
  if (question.kind === 'single') {
    if (!question.required) return true;
    return draft[question.field] !== null;
  }
  return true;
}
