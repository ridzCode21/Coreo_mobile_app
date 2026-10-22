import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { memoryFactCorrectionSchema } from '@/features/profile/schemas';
import { apiClient } from '@/shared/api/client';

const memoryFactSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  source_label: z.string(),
  stored_at: z.string(),
  badge: z.string().nullable(),
});

export const memoryFactsPayloadSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  footer: z.string(),
  prompt: z.string(),
  facts: z.array(memoryFactSchema),
});

export type MemoryFact = z.infer<typeof memoryFactSchema>;
export type MemoryFactsPayload = z.infer<typeof memoryFactsPayloadSchema>;

export const memoryFactsKeys = { all: ['memoryFacts'] as const };

export function useMemoryFactsQuery() {
  return useQuery({
    queryKey: memoryFactsKeys.all,
    queryFn: async () =>
      memoryFactsPayloadSchema.parse(await apiClient.get<unknown>('/users/me/memory-facts/')),
  });
}

export function useCorrectMemoryFactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      memoryFactSchema.parse(
        await apiClient.patch<unknown>(
          `/users/me/memory-facts/${id}/`,
          memoryFactCorrectionSchema.parse({ text }),
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryFactsKeys.all }),
  });
}

export function useDeleteMemoryFactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/users/me/memory-facts/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryFactsKeys.all }),
  });
}

export function useDeleteAllMemoryFactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<void>('/users/me/memory-facts/'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoryFactsKeys.all }),
  });
}
