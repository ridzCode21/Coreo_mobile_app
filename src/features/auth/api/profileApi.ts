import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';
import { CALIBRATION_WAVES } from '@/shared/types/user';

const profileResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      first_name: z.string(),
      calibration_day: z.number().int().nullable(),
      calibration_complete: z.boolean(),
      wave: z.enum(CALIBRATION_WAVES).nullable(),
    }),
  }),
});

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
