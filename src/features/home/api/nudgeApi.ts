import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

const nudgeCardSchema = z.object({
  rule_id: z.enum([
    'wellness_rough_night',
    'diet_carbs_before_session',
    'fitness_session_today',
    'wellness_short_sleep',
  ]),
  domain: z.enum(['wellness', 'diet', 'fitness']),
  eyebrow: z.string(),
  when_label: z.string(),
  home_line: z.string(),
  diet_line: z.string().nullable(),
  title: z.string(),
  body: z.string(),
  time_label: z.string(),
});

const nudgeResponseSchema = z.union([
  z.object({ nudge: z.null(), message: z.string().nullable() }),
  z.object({ nudge: nudgeCardSchema }),
]);

export type NudgeResponse = z.infer<typeof nudgeResponseSchema>;

export const nudgeKeys = {
  all: ['nudge'] as const,
};

export function useNudgeQuery() {
  return useQuery({
    queryKey: nudgeKeys.all,
    queryFn: async (): Promise<NudgeResponse> => {
      const response = await apiClient.get<unknown>('/users/me/nudge/');
      return nudgeResponseSchema.parse(response);
    },
  });
}
