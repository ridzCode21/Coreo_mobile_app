import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

import { DEVICE_SOURCES } from './sourceConstants';

export { DEVICE_SOURCES } from './sourceConstants';

const rawSourceStatusSchema = z.object({
  source: z.string(),
  connected: z.boolean(),
  last_synced_at: z.string().datetime({ offset: true }).nullable(),
  synced_through: z.string().date().nullable(),
  status: z.enum(['live', 'quiet', 'estimate']).nullable(),
});

const sourcesResponseSchema = z.object({
  success: z.literal(true),
  sources: z.array(rawSourceStatusSchema),
  last_night: z.object({
    date: z.string().date(),
    sleep: z
      .object({
        hours: z.number(),
        source: z.string(),
        estimate: z.boolean(),
      })
      .nullable(),
    recovery: z
      .object({
        score: z.number().int(),
        source: z.enum(['whoop', 'oura']),
      })
      .nullable(),
  }),
});

export type SourceStatus = {
  source: (typeof DEVICE_SOURCES)[number];
  connected: boolean;
  last_synced_at: string | null;
  synced_through: string | null;
  status?: 'live' | 'quiet' | 'estimate' | null;
};

export type LastNight = z.infer<typeof sourcesResponseSchema>['last_night'];

type SourcesEnvelope = z.infer<typeof sourcesResponseSchema>;

export const sourcesKeys = {
  all: ['integrationSources'] as const,
};

function isDeviceSource(source: z.infer<typeof rawSourceStatusSchema>): source is z.infer<
  typeof rawSourceStatusSchema
> & {
  source: (typeof DEVICE_SOURCES)[number];
} {
  return DEVICE_SOURCES.some((knownSource) => knownSource === source.source);
}

function useSourcesEnvelopeQuery<T>(select: (envelope: SourcesEnvelope) => T) {
  return useQuery({
    queryKey: sourcesKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/integrations/sources/');
      return sourcesResponseSchema.parse(response);
    },
    select,
  });
}

export function useSourcesQuery() {
  return useSourcesEnvelopeQuery((envelope) => envelope.sources.filter(isDeviceSource));
}

export function useLastNightQuery() {
  return useSourcesEnvelopeQuery((envelope) => envelope.last_night);
}
