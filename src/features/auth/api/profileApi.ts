import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

const profileResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      first_name: z.string(),
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
