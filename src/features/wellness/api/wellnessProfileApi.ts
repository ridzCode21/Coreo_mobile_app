import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import {
  wellnessProfilePatchSchema,
  wellnessProfileSchema,
  type WellnessProfilePatch,
} from '@/shared/types/wellnessProfile';

export const wellnessProfileKeys = {
  all: ['wellnessProfile'] as const,
};

export function useWellnessProfileQuery() {
  return useQuery({
    queryKey: wellnessProfileKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/me/wellness-profile/');
      return wellnessProfileSchema.parse(response);
    },
  });
}

export function useUpdateWellnessProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: WellnessProfilePatch) => {
      const response = await apiClient.put<unknown>(
        '/users/me/wellness-profile/',
        wellnessProfilePatchSchema.parse(patch),
      );
      return wellnessProfileSchema.parse(response);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(wellnessProfileKeys.all, profile);
    },
  });
}
