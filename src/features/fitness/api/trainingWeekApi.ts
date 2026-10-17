import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import {
  markSetRequestSchema,
  trainingWeekResponseSchema,
  type MarkSetRequest,
} from '@/shared/types/trainingWeek';

export const trainingWeekKeys = {
  all: ['trainingWeek'] as const,
};

export function useTrainingWeekQuery(enabled = true) {
  return useQuery({
    queryKey: trainingWeekKeys.all,
    enabled,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/me/training-week/');
      return trainingWeekResponseSchema.parse(response);
    },
  });
}

export function useMarkSetDoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: MarkSetRequest) => {
      const body = markSetRequestSchema.parse(request);
      const response = await apiClient.post<unknown>('/users/me/training-week/sets/', body);
      return trainingWeekResponseSchema.parse(response);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(trainingWeekKeys.all, response);
    },
  });
}
