import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { queryClient as appQueryClient } from '@/shared/api/queryClient';
import { onSessionEnd } from '@/shared/lib/sessionCleanup';
import {
  eveningCheckInCloseResponseSchema,
  eveningCheckInRitualSchema,
  type EveningCheckInMoodKey,
} from '@/shared/types/eveningCheckIn';

export const eveningCheckInKeys = { all: ['eveningCheckIn'] as const };

// The recap and the saved mood are personal data: never outlive the sign-in.
onSessionEnd(() => appQueryClient.removeQueries({ queryKey: eveningCheckInKeys.all }));

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
    mutationFn: async ({ mood, note }: CloseInput) => {
      const trimmed = note.trim();
      return eveningCheckInCloseResponseSchema.parse(
        await apiClient.post<unknown>('/users/me/evening-check-in/', {
          mood,
          ...(trimmed ? { note: trimmed } : {}),
        }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eveningCheckInKeys.all }),
  });
}
