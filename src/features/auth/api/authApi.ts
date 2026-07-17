import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import type { LoginFormValues } from '@/features/auth/schemas';

type LoginResponse = {
  token: string;
};

/**
 * There is no real backend yet (see docs/product-context.md — MVP is mock-API-first). This
 * mutation is wired against the shared client so it's a one-line swap to a real endpoint later;
 * feature/screen code should depend on this hook, not know whether the response is mocked.
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiClient.post<LoginResponse>('/auth/login', values, { auth: false }),
  });
}
