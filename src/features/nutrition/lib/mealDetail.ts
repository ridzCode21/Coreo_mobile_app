import { ApiError } from '@/shared/api/errors';
import type { BudgetTier } from '@/shared/types/dietProfile';

const COST_TIER_LABEL: Record<BudgetTier, string> = {
  budget_friendly: 'Budget-friendly cost',
  moderate: 'Moderate cost',
  premium: 'Premium cost',
};

type RecipeRefusedCopy = {
  title: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function costTierLabel(tier: BudgetTier | ''): string | null {
  return tier ? COST_TIER_LABEL[tier] : null;
}

export function recipeRefusedFrom(error: unknown): RecipeRefusedCopy | null {
  if (!(error instanceof ApiError) || error.status !== 422 || !isRecord(error.details)) return null;
  if (error.details.error !== 'recipe_check_failed') return null;
  return {
    title: "I couldn't write this one honestly.",
    message:
      "The steps didn't match the meal as planned. Nothing logged, nothing lost — the meal above is unchanged.",
  };
}
