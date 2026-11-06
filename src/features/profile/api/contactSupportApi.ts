import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';

export type SendSupportMessageValues = {
  subject: string;
  message: string;
};

const contactSupportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    support_request: z.object({
      id: z.string(),
      subject: z.string(),
      category: z.enum(['bug', 'feature', 'support', 'other']),
      submitted_at: z.string(),
    }),
  }),
  message: z.string(),
});

export function useSendSupportMessageMutation() {
  return useMutation({
    mutationFn: async (values: SendSupportMessageValues) =>
      contactSupportResponseSchema.parse(
        await apiClient.post<unknown>('/core/contact-support/', {
          ...values,
          category: 'support',
          attach_logs: false,
        }),
      ),
  });
}
