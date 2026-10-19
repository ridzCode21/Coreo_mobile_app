import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { fitnessProfileKeys } from '@/features/fitness';
import { dietProfileKeys } from '@/features/onboarding';
import { wellnessProfileKeys } from '@/features/wellness';
import { apiClient } from '@/shared/api/client';

const exportSchema = z
  .object({
    schema_version: z.number(),
    exported_at: z.string(),
    account: z.object({ id: z.string() }),
  })
  .passthrough();
export type DataExport = z.infer<typeof exportSchema>;

export function useExportDataMutation() {
  return useMutation({
    mutationFn: async () =>
      exportSchema.parse(await apiClient.get<unknown>('/users/me/data/export/')),
  });
}

export function useDeleteAccountDataMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<void>('/users/me/data/'),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dietProfileKeys.all }),
        queryClient.invalidateQueries({ queryKey: fitnessProfileKeys.all }),
        queryClient.invalidateQueries({ queryKey: wellnessProfileKeys.all }),
      ]),
  });
}

export function useDeleteAccountMutation() {
  return useMutation({ mutationFn: () => apiClient.delete<void>('/users/me/') });
}
