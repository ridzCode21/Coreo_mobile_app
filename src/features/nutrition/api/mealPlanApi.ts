import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/errors';
import { apiClient } from '@/shared/api/client';
import { dietProfileKeys } from '@/features/onboarding';
import { nutritionKeys } from '@/features/nutrition/api/nutritionApi';
import type {
  AssistantPromptOption,
  AssistantResponse,
  AteSomethingElseResponse,
  FeedbackType,
  MealActionStatusResponse,
  MealPlanCreateResponse,
  MealPlanDetail,
  RecipeJson,
  RegenerationReason,
  ReplacePreviewResponse,
} from '@/shared/types/mealPlan';
import type { MealType } from '@/shared/types/food';

export const mealPlanKeys = {
  all: ['mealPlan'] as const,
  byDate: (date: string) => ['mealPlan', date] as const,
  assistantPrompts: (context: 'meal_plan') => ['mealPlan', 'assistant-prompts', context] as const,
  recipe: (date: string, mealId: number) => ['mealPlan', date, 'recipe', mealId] as const,
};

function invalidateMealPlan(queryClient: ReturnType<typeof useQueryClient>, date: string) {
  queryClient.invalidateQueries({ queryKey: mealPlanKeys.byDate(date) });
  queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
}

export function useMealPlanQuery(date: string) {
  return useQuery({
    queryKey: mealPlanKeys.byDate(date),
    queryFn: () => apiClient.get<MealPlanDetail>(`/meal-plans/${date}/`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'ready' || status === 'failed') return false;
      return 2000;
    },
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
  });
}

export function useCreateMealPlanMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<MealPlanCreateResponse>('/meal-plans/', {
        date,
        plan_mode: 'standard',
        regeneration_reason: '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.byDate(date) });
    },
  });
}

export function useRegenerateMealPlanMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      regeneration_reason: RegenerationReason;
      plan_mode?: 'standard' | 'historical';
    }) =>
      apiClient.post<MealPlanCreateResponse>(`/meal-plans/${date}/regenerate/`, {
        regeneration_reason: values.regeneration_reason,
        plan_mode: values.plan_mode ?? 'standard',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.byDate(date) });
    },
  });
}

export function useMealRecipeQuery(date: string, mealId: number, enabled: boolean) {
  return useQuery({
    queryKey: mealPlanKeys.recipe(date, mealId),
    queryFn: () => apiClient.get<RecipeJson>(`/meal-plans/${date}/meals/${mealId}/recipe/`),
    enabled,
    retry: false,
  });
}

export function useLogPlannedMealMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { mealId: number; actual_calories?: number }) =>
      apiClient.post<MealActionStatusResponse>(
        `/meal-plans/${date}/meals/${values.mealId}/log/`,
        values.actual_calories === undefined ? {} : { actual_calories: values.actual_calories },
      ),
    onSuccess: () => invalidateMealPlan(queryClient, date),
  });
}

export function useSkipPlannedMealMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      apiClient.post<MealActionStatusResponse>(`/meal-plans/${date}/meals/${mealId}/skip/`),
    onSuccess: () => invalidateMealPlan(queryClient, date),
  });
}

export function useAdjustMealQuantityMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { mealId: number; portion_multiplier: number }) =>
      apiClient.post<MealActionStatusResponse>(
        `/meal-plans/${date}/meals/${values.mealId}/adjust-quantity/`,
        { portion_multiplier: values.portion_multiplier },
      ),
    onSuccess: () => invalidateMealPlan(queryClient, date),
  });
}

export function useMealFeedbackMutation(date: string) {
  return useMutation({
    mutationFn: (values: { mealId: number; feedback_type: FeedbackType; note?: string }) =>
      apiClient.post<{ id: number }>(`/meal-plans/${date}/meals/${values.mealId}/feedback/`, {
        feedback_type: values.feedback_type,
        note: values.note,
      }),
  });
}

export function useReplacePreviewMutation(date: string) {
  return useMutation({
    mutationFn: (values: { mealId: number; preference?: string }) =>
      apiClient.post<ReplacePreviewResponse>(
        `/meal-plans/${date}/meals/${values.mealId}/replace/preview/`,
        { preference: values.preference ?? '' },
      ),
  });
}

export function useReplaceConfirmMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { mealId: number; preview_token: string; chosen_index: number }) =>
      apiClient.post<MealActionStatusResponse>(
        `/meal-plans/${date}/meals/${values.mealId}/replace/confirm/`,
        { preview_token: values.preview_token, chosen_index: values.chosen_index },
      ),
    onSuccess: () => invalidateMealPlan(queryClient, date),
  });
}

export function useAteSomethingElseMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      meal_type?: MealType;
      planned_meal_id?: number;
      description: string;
      approx_calories: number;
      approx_protein_g: number;
    }) =>
      apiClient.post<AteSomethingElseResponse>(`/meal-plans/${date}/ate-something-else/`, values),
    onSuccess: () => invalidateMealPlan(queryClient, date),
  });
}

export function useAssistantPromptsQuery(context: 'meal_plan') {
  return useQuery({
    queryKey: mealPlanKeys.assistantPrompts(context),
    queryFn: () =>
      apiClient.get<{ options: AssistantPromptOption[] }>(
        `/meals/assistant-prompts/?context=${context}`,
      ),
  });
}

export function useAssistantMutation(date: string) {
  return useMutation({
    mutationFn: (promptOptionId: number) =>
      apiClient.post<AssistantResponse>(`/meal-plans/${date}/assistant/`, {
        prompt_option_id: promptOptionId,
      }),
  });
}

export function useAssistantConfirmMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      apiClient.post<MealActionStatusResponse>(`/meal-plans/${date}/assistant/confirm/`, {
        proposal_id: proposalId,
      }),
    onSuccess: () => {
      invalidateMealPlan(queryClient, date);
      queryClient.invalidateQueries({ queryKey: dietProfileKeys.all });
    },
  });
}
