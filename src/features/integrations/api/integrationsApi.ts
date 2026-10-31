import { MutationObserver, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { retryDelay, shouldRetryImport } from '@/features/integrations/lib/retry';
import type { DeviceDailyLog, DeviceSource } from '@/features/integrations/lib/types';
import { apiClient } from '@/shared/api/client';

// `POST /insights/import/` (backend docs §19). Day totals the phone already read; the server
// replaces each day it receives, so re-sending is safe.
export type ImportDeviceBatchVariables = { source: DeviceSource; daily_logs: DeviceDailyLog[] };

const importResponseSchema = z.object({
  success: z.literal(true),
  source: z.enum(['apple_health', 'health_connect']),
  days_written: z.number().int(),
  last_synced_at: z.string(),
  synced_through: z.string().nullable(),
});
export type ImportDeviceBatchResult = z.infer<typeof importResponseSchema>;

export async function importDeviceBatch(
  body: ImportDeviceBatchVariables,
): Promise<ImportDeviceBatchResult> {
  return importResponseSchema.parse(await apiClient.post<unknown>('/insights/import/', body));
}

const importDeviceBatchOptions = {
  mutationKey: ['importDeviceBatch'] as const,
  mutationFn: importDeviceBatch,
  retry: shouldRetryImport,
  retryDelay,
};

/** Sends one batch through the query client, so retries and errors behave the same whether the
 * caller is a screen's hook or the background task (which has no React). */
export function importDeviceBatchWith(
  queryClient: QueryClient,
  variables: ImportDeviceBatchVariables,
): Promise<ImportDeviceBatchResult> {
  return new MutationObserver(queryClient, importDeviceBatchOptions).mutate(variables);
}
