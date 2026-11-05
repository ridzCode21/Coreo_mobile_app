import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
};

const changePasswordResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (values: ChangePasswordRequest) =>
      changePasswordResponseSchema.parse(
        await apiClient.post<unknown>('/users/password-change/', values),
      ),
  });
}
