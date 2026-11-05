import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';
import { CALIBRATION_WAVES } from '@/shared/types/user';

const profileUserSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  calibration_day: z.number().int().nullable(),
  calibration_complete: z.boolean(),
  wave: z.enum(CALIBRATION_WAVES).nullable(),
  timezone: z.string(),
  created_at: z.string().datetime({ offset: true }),
});

export const profileResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: profileUserSchema,
  }),
});

export type ProfileUser = z.infer<typeof profileUserSchema>;
export type UpdateProfileValues = Pick<ProfileUser, 'first_name' | 'last_name'>;

export const profileKeys = {
  all: ['profile'] as const,
};

export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/profile/');
      return profileResponseSchema.parse(response).data.user;
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateProfileValues) => {
      const response = await apiClient.put<unknown>('/users/profile/update/', values);
      return profileResponseSchema.parse(response).data.user;
    },
    onSuccess: (user) => queryClient.setQueryData(profileKeys.all, user),
  });
}
