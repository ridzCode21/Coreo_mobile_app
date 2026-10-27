import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import {
  eveningCheckInCloseResponseSchema,
  eveningCheckInRitualSchema,
  type EveningCheckInMoodKey,
} from '@/shared/types/eveningCheckIn';

export const eveningCheckInKeys = { all: ['eveningCheckIn'] as const };

export function useEveningCheckInQuery() {
  return useQuery({
    queryKey: eveningCheckInKeys.all,
    queryFn: async () =>
      eveningCheckInRitualSchema.parse(await apiClient.get<unknown>('/users/me/evening-check-in/')),
  });
}

type CloseInput = { mood: EveningCheckInMoodKey; note: string };

export function useCloseEveningCheckInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mood, note }: CloseInput) =>
      eveningCheckInCloseResponseSchema.parse(
        await apiClient.post<unknown>('/users/me/evening-check-in/', {
          mood,
          ...(note ? { note } : {}),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eveningCheckInKeys.all }),
  });
}
