import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { rightNowResponseSchema } from '@/shared/types/rightNow';

export const rightNowKeys = {
  all: ['rightNow'] as const,
};

export function useRightNowQuery(enabled = true) {
  return useQuery({
    queryKey: rightNowKeys.all,
    enabled,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/users/me/right-now/');
      return rightNowResponseSchema.parse(response);
    },
  });
}
