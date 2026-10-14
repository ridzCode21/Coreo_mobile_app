import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

export const DEVICE_SOURCES = ['apple_health', 'health_connect', 'strava'] as const;

const sourceStatusSchema = z.object({
  source: z.enum(DEVICE_SOURCES),
  connected: z.boolean(),
  last_synced_at: z.string().datetime({ offset: true }).nullable(),
  synced_through: z.string().date().nullable(),
});

const sourcesResponseSchema = z.object({
  success: z.literal(true),
  sources: z.array(sourceStatusSchema),
});

export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const sourcesKeys = {
  all: ['integrationSources'] as const,
};

export function useSourcesQuery() {
  return useQuery({
    queryKey: sourcesKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/integrations/sources/');
      return sourcesResponseSchema.parse(response).sources;
    },
  });
}
