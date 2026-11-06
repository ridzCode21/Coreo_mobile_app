import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

const appConfigResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    config: z.object({
      settings: z.object({
        terms_url: z.string().url(),
        privacy_policy_url: z.string().url(),
      }),
    }),
  }),
});

export const appConfigKeys = {
  all: ['appConfig'] as const,
};

export function useAppConfigQuery() {
  return useQuery({
    queryKey: appConfigKeys.all,
    queryFn: async () => {
      const response = appConfigResponseSchema.parse(await apiClient.get<unknown>('/core/config/'));
      return {
        termsUrl: response.data.config.settings.terms_url,
        privacyUrl: response.data.config.settings.privacy_policy_url,
      };
    },
  });
}
