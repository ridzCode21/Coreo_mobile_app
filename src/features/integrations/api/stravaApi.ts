import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { z } from 'zod';

import { sourcesKeys } from '@/features/home';
import { apiClient } from '@/shared/api/client';

const exchangeStravaResponseSchema = z.object({
  success: z.literal(true),
  athlete_id: z.number().int(),
  activities_imported: z.number().int(),
});

export type StravaExchange = z.infer<typeof exchangeStravaResponseSchema>;

type StravaExchangeVariables = {
  code: string;
  codeVerifier: string;
};

const disconnectStravaResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export type StravaDisconnect = z.infer<typeof disconnectStravaResponseSchema>;

export async function exchangeStravaCode(
  code: string,
  codeVerifier: string,
): Promise<StravaExchange> {
  const response = await apiClient.post<unknown>('/integrations/strava/exchange/', {
    code,
    code_verifier: codeVerifier,
  });
  return exchangeStravaResponseSchema.parse(response);
}

export function useConnectStravaMutation(): UseMutationResult<
  StravaExchange,
  Error,
  StravaExchangeVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, codeVerifier }: StravaExchangeVariables) =>
      exchangeStravaCode(code, codeVerifier),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKeys.all }),
  });
}

export async function disconnectStrava(): Promise<StravaDisconnect> {
  const response = await apiClient.post<unknown>('/integrations/strava/disconnect/');
  return disconnectStravaResponseSchema.parse(response);
}

export function useDisconnectStravaMutation(): UseMutationResult<StravaDisconnect, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectStrava,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKeys.all }),
  });
}
