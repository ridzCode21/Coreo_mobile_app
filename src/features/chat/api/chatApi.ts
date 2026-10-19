import { useMutation, useQueryClient } from '@tanstack/react-query';

import { mealPlanKeys, nutritionKeys, todayISO } from '@/features/nutrition';
import { apiClient } from '@/shared/api/client';
import {
  chatConfirmResponseSchema,
  chatProposeResponseSchema,
  chatUndoResponseSchema,
  type ChatConfirmResponse,
  type ChatProposeResponse,
  type ChatUndoResponse,
} from '@/shared/types/chat';

export const chatKeys = { all: ['chat'] as const };

function invalidateNutrition(queryClient: ReturnType<typeof useQueryClient>) {
  const today = todayISO();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: mealPlanKeys.byDate(today) }),
    queryClient.invalidateQueries({ queryKey: nutritionKeys.dailySummary(today) }),
  ]);
}

export function useProposeChatMutation() {
  return useMutation({
    mutationFn: async (message: string): Promise<ChatProposeResponse> =>
      chatProposeResponseSchema.parse(
        await apiClient.post<unknown>('/users/me/chat/', { message }),
      ),
  });
}

export function useConfirmChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string): Promise<ChatConfirmResponse> =>
      chatConfirmResponseSchema.parse(
        await apiClient.post<unknown>('/users/me/chat/confirm/', { proposal_id: proposalId }),
      ),
    onSuccess: () => invalidateNutrition(queryClient),
  });
}

export function useUndoChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string): Promise<ChatUndoResponse> =>
      chatUndoResponseSchema.parse(
        await apiClient.post<unknown>('/users/me/chat/undo/', { proposal_id: proposalId }),
      ),
    onSuccess: () => invalidateNutrition(queryClient),
  });
}
