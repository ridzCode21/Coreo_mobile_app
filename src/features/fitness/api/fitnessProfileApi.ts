import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import {
  fitnessProfilePatchSchema,
  fitnessProfileSchema,
  type FitnessProfilePatch,
} from '@/shared/types/fitnessProfile';

export const fitnessProfileKeys = {
  all: ['fitnessProfile'] as const,
};

export function useFitnessProfileQuery() {
  return useQuery({
    queryKey: fitnessProfileKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/me/fitness-profile/');
      return fitnessProfileSchema.parse(response);
    },
  });
}

export function useUpdateFitnessProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: FitnessProfilePatch) => {
      const response = await apiClient.put<unknown>(
        '/users/me/fitness-profile/',
        fitnessProfilePatchSchema.parse(patch),
      );
      return fitnessProfileSchema.parse(response);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(fitnessProfileKeys.all, profile);
    },
  });
}
