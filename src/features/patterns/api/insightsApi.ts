import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

export const CORRELATION_COLUMNS = [
  'calories_in',
  'calories_out',
  'protein_g',
  'carbs_g',
  'fat_g',
  'water_ml',
  'steps',
  'weight_kg',
  'sleep_hours',
  'hrv',
] as const;

export const insightCardSchema = z
  .object({
    id: z.number(),
    col_x: z.enum(CORRELATION_COLUMNS),
    col_y: z.enum(CORRELATION_COLUMNS),
    r_value: z.number(),
    lag_days: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    insight_text: z.string(),
    autocorrelation_warning: z.boolean(),
    created_at: z.string().datetime({ offset: true }),
    disclaimer: z.string(),
  })
  .strict();

export const insightsResponseSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('not_enough_data'),
      days_logged: z.number().int(),
      days_remaining: z.number().int(),
    })
    .strict(),
  z.object({ status: z.literal('no_insights'), message: z.string() }).strict(),
  z.object({ status: z.literal('ready'), insights: z.array(insightCardSchema) }).strict(),
]);

export type Insight = z.infer<typeof insightCardSchema>;
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

export const insightsKeys = {
  all: ['insights'] as const,
};

export function useInsightsQuery() {
  return useQuery({
    queryKey: insightsKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<unknown>('/insights/');
      return insightsResponseSchema.parse(response);
    },
  });
}
