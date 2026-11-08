import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { sourcesKeys } from '@/features/home';
import { apiClient } from '@/shared/api/client';

const exchangeStravaResponseSchema = z.object({
  success: z.literal(true),
  athlete_id: z.number().int(),
  activities_imported: z.number().int(),
});

export type StravaExchange = z.infer<typeof exchangeStravaResponseSchema>;

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

export function useConnectStravaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, codeVerifier }: { code: string; codeVerifier: string }) =>
      exchangeStravaCode(code, codeVerifier),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKeys.all }),
  });
}
