import type { BudgetTier, CookingFrequency } from '@/shared/types/dietProfile';
import type { MealType } from '@/shared/types/food';

export const MEAL_PLAN_STATUSES = [
  'pending',
  'generating',
  'validating',
  'ready',
  'failed',
] as const;
export type MealPlanStatus = (typeof MEAL_PLAN_STATUSES)[number];

export const PLANNED_MEAL_STATUSES = [
  'planned',
  'logged_as_planned',
  'logged_modified',
  'skipped',
  'replaced',
  'eaten_outside',
  'missed',
] as const;
export type PlannedMealStatus = (typeof PLANNED_MEAL_STATUSES)[number];

export const REGENERATION_REASONS = [
  'too_boring',
  'too_expensive',
  'too_much_cooking',
  'dont_like_foods',
  'need_more_protein',
  'make_lighter',
  'different_cuisine',
  'surprise_me',
] as const;
export type RegenerationReason = (typeof REGENERATION_REASONS)[number];

export const FEEDBACK_TYPES = [
  'like',
  'dislike',
  'too_heavy',
  'too_light',
  'too_much_cooking',
  'too_expensive',
  'not_available',
  'other',
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type PlannedMeal = {
  id: number;
  date: string;
  meal_type: MealType;
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  rationale: string;
  recipe_json: RecipeJson | null;
  replaced_at: string | null;
  replacement_of_id: number | null;
  constraint_violation: boolean;
  status: PlannedMealStatus;
  serving_size: string;
  portion_multiplier: number;
  base_calories_kcal: number | null;
  base_protein_g: number | null;
  base_carbs_g: number | null;
  base_fat_g: number | null;
  ingredients_json: { name: string; quantity: string }[];
  prep_time_minutes: number;
  estimated_cost_tier: BudgetTier;
  confidence_note: string;
};

export type ValidationResult = {
  self_check_status: string;
  macro_ok: boolean | null;
  violation_count: number;
  self_check_issues: string[];
};

export type MealPlanDetail = {
  id: number;
  status: MealPlanStatus;
  date_start: string;
  date_end: string;
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  validation_result: ValidationResult;
  self_check_status: string;
  plan_mode: 'standard' | 'historical';
  historical_fallback_reason: string;
  meals: PlannedMeal[];
};

export type QuotaAction =
  'assistant' | 'plan_generate' | 'plan_regenerate' | 'recipe_generate' | 'replace_preview';

export type QuotaExceededError = {
  error: 'quota_exceeded';
  action: QuotaAction;
  message: string;
  limit: number;
  tier: 'free' | 'premium';
  quota_resets_at: string;
};

export type AssistantPromptOption = { id: number; display_text: string };

export type AssistantProposal = {
  proposal_id: string;
  summary: string;
  requires_confirmation: true;
  preview: unknown;
  expires_at: string;
};

export type AssistantIntent =
  | 'replace_meal'
  | 'modify_meal'
  | 'adjust_quantity'
  | 'skip_meal'
  | 'log_meal'
  | 'ate_something_else'
  | 'regenerate_plan'
  | 'submit_feedback'
  | 'get_recipe';

export type RecipeJson = {
  title: string;
  steps: string[];
  ingredients: { name: string; quantity: string }[];
  prep_time_minutes: number;
  note: string;
};

export type MealPlanCreateResponse = {
  plan_id: number;
  status: MealPlanStatus;
};

export type MealActionStatusResponse = {
  id?: number;
  status: PlannedMealStatus | 'ok';
  food_entry_id?: number;
  meal_id?: number;
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type ReplacePreviewAlternative = Omit<
  PlannedMeal,
  'id' | 'date' | 'meal_type' | 'status' | 'replaced_at' | 'replacement_of_id'
>;

export type ReplacePreviewResponse = {
  alternatives: ReplacePreviewAlternative[];
  preview_token: string;
};

export type AteSomethingElseResponse = {
  status: 'ok';
  remaining_calories: number;
  food_entry_id: number;
};

export type AssistantResponse = { recipe: RecipeJson } | AssistantProposal;

export type ContextualDietAsk = 'cuisine' | 'budget' | 'cooking';
export type ContextualDietAskValue = BudgetTier | CookingFrequency | string;
