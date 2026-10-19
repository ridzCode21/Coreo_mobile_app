/**
 * Issue #43 — the chat API hooks must call the exact routes/payloads the backend defines
 * (`apps/users/urls.py:38-40`, `API_REFERENCE.md:935-999`) and must not trust a malformed response
 * (schema-parse it before returning). Confirm/undo both mutate the active dinner on the backend
 * (`services/chat.py:132-142`, `:358-367`), so they must invalidate the same meal-plan caches the
 * nutrition screens read, the same way `mealPlanApi.ts`'s own confirm mutations already do
 * (`invalidateMealPlan`, `mealPlanApi.ts:29-34`).
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useConfirmChatMutation,
  useProposeChatMutation,
  useUndoChatMutation,
} from '@/features/chat/api/chatApi';
import { mealPlanKeys } from '@/features/nutrition/api/mealPlanApi';
import { nutritionKeys, todayISO } from '@/features/nutrition/api/nutritionApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

const FULL_RECEIPTS = [
  {
    pillar: 'fitness',
    kind: 'changed',
    label: 'Fitness moved',
    summary: 'Push session → 20-min walk on your 7 PM call',
    detail: 'Session moves to Thursday. The week still adds up.',
  },
];

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('chatApi: useProposeChatMutation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts {message} to /users/me/chat/', async () => {
    mockPost.mockResolvedValue({
      listening: 'Listening',
      heard: 'hi',
      line: null,
      receipts: [],
      hint: 'Hold to talk · tap the bubble to type',
      proposal_id: null,
      requires_confirmation: false,
    });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useProposeChatMutation(), { wrapper: wrapper(client) });

    const response = await result.current.mutateAsync('hi');

    expect(mockPost).toHaveBeenCalledWith('/users/me/chat/', { message: 'hi' });
    expect(response.requires_confirmation).toBe(false);
    client.clear();
  });

  it('rejects when the response does not match the schema (no blind trust of the payload)', async () => {
    mockPost.mockResolvedValue({ listening: 'Listening' }); // missing every other required field
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useProposeChatMutation(), { wrapper: wrapper(client) });

    await expect(result.current.mutateAsync('hi')).rejects.toBeTruthy();
    client.clear();
  });
});

describe('chatApi: useConfirmChatMutation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts {proposal_id} to /users/me/chat/confirm/ and invalidates meal-plan caches on success', async () => {
    mockPost.mockResolvedValue({ proposal_id: 'turn-1', applied: true, receipts: FULL_RECEIPTS });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
    const { result } = renderHook(() => useConfirmChatMutation(), { wrapper: wrapper(client) });

    await result.current.mutateAsync('turn-1');

    expect(mockPost).toHaveBeenCalledWith('/users/me/chat/confirm/', { proposal_id: 'turn-1' });
    await waitFor(() =>
      expect(client.invalidateQueries).toHaveBeenCalledWith({
        queryKey: mealPlanKeys.byDate(todayISO()),
      }),
    );
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: nutritionKeys.dailySummary(todayISO()),
    });
    client.clear();
  });
});

describe('chatApi: useUndoChatMutation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts {proposal_id} to /users/me/chat/undo/ and invalidates meal-plan caches on success', async () => {
    mockPost.mockResolvedValue({ proposal_id: 'turn-1', undone: true, receipts: FULL_RECEIPTS });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
    const { result } = renderHook(() => useUndoChatMutation(), { wrapper: wrapper(client) });

    await result.current.mutateAsync('turn-1');

    expect(mockPost).toHaveBeenCalledWith('/users/me/chat/undo/', { proposal_id: 'turn-1' });
    await waitFor(() =>
      expect(client.invalidateQueries).toHaveBeenCalledWith({
        queryKey: mealPlanKeys.byDate(todayISO()),
      }),
    );
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: nutritionKeys.dailySummary(todayISO()),
    });
    client.clear();
  });
});
