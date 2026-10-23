import { MutationObserver, useMutation, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';
import {
  checkInAnswerSchema,
  type CheckInAnswer,
} from '@/features/notifications/lib/checkInNotice';

// `POST /users/me/check-in-notices/{notice_id}/answer/` (API_REFERENCE §5): the body is
// `{ action: 'good' | 'rough' }`; `open` is not an answer and the server answers 400 to it.
const answerBodySchema = z.object({ action: checkInAnswerSchema });

const answeredNoticeSchema = z.object({
  id: z.string(),
  answer: checkInAnswerSchema.nullable(),
  answered_at: z.string().nullable(),
});
export type AnsweredNotice = z.infer<typeof answeredNoticeSchema>;

export type AnswerCheckInNoticeVariables = { noticeId: string; answer: CheckInAnswer };

export async function answerCheckInNotice({
  noticeId,
  answer,
}: AnswerCheckInNoticeVariables): Promise<AnsweredNotice> {
  return answeredNoticeSchema.parse(
    await apiClient.post<unknown>(
      `/users/me/check-in-notices/${encodeURIComponent(noticeId)}/answer/`,
      answerBodySchema.parse({ action: answer }),
    ),
  );
}

export const answerCheckInNoticeMutationOptions = {
  mutationKey: ['checkInNotice', 'answer'] as const,
  mutationFn: answerCheckInNotice,
};

export function useAnswerCheckInNoticeMutation() {
  return useMutation(answerCheckInNoticeMutationOptions);
}

/**
 * For the lock-screen button handler, which runs outside React (even with the app closed): the
 * same mutation, run through the query client so it has the same retry and error rules.
 */
export function answerCheckInNoticeWith(
  queryClient: QueryClient,
  variables: AnswerCheckInNoticeVariables,
): Promise<AnsweredNotice> {
  return new MutationObserver(queryClient, answerCheckInNoticeMutationOptions).mutate(variables);
}
