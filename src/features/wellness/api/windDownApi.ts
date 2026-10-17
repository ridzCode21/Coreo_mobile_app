import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { windDownResponseSchema } from '@/shared/types/windDown';

export const windDownKeys = {
  all: ['windDown'] as const,
};

export function useWindDownQuery(enabled = true) {
  return useQuery({
    queryKey: windDownKeys.all,
    enabled,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/me/wind-down/');
      return windDownResponseSchema.parse(response);
    },
  });
}
