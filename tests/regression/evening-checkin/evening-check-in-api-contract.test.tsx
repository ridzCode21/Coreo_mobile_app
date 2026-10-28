/**
 * Issue #46 — `useEveningCheckInQuery` / `useCloseEveningCheckInMutation` contract against
 * `GET/POST /users/me/evening-check-in/` (`apps/users/urls.py:58`). Pattern mirrors
 * `wind-down-api-contract.test.tsx`: `apiClient` mocked directly so this protects the hooks' own
 * request/response wiring, independent of the mock-router test
 * (`evening-check-in-mock.test.ts`).
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  eveningCheckInKeys,
  useCloseEveningCheckInMutation,
  useEveningCheckInQuery,
} from '@/features/evening-checkin/api/eveningCheckInApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

const OPEN_RITUAL = {
  eyebrow: 'Evening check-in · 20 seconds',
  question: 'How did today feel?',
  moods: [
    { key: 'rough', label: 'Rough' },
    { key: 'meh', label: 'Meh' },
    { key: 'okay', label: 'Okay' },
    { key: 'good', label: 'Good' },
    { key: 'great', label: 'Great' },
  ],
  looks_right_label: 'Looks right?',
  fix_label: 'Fix something',
  recap: ['7,904 steps'],
  note_prompt: 'Anything for tomorrow-me?',
  close_label: 'Close the day',
  closed: false,
};

const CLOSE_RESPONSE = {
  check_in: { local_date: '2026-10-05', mood: 'good', closed: true },
  preview: {
    eyebrow: 'Tomorrow, previewed',
    line: "Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here.",
    action: 'Good night',
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function wrapperWithClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('eveningCheckIn: useEveningCheckInQuery contract (GET /users/me/evening-check-in/, #46)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/evening-check-in/', async () => {
    mockGet.mockResolvedValue(OPEN_RITUAL);

    const { result } = renderHook(() => useEveningCheckInQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/evening-check-in/');
  });

  it('returns the parsed payload unchanged (bare payload, no envelope unwrap)', async () => {
    mockGet.mockResolvedValue(OPEN_RITUAL);

    const { result } = renderHook(() => useEveningCheckInQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(OPEN_RITUAL);
  });

  it('parses the closed state with preview: null and a message', async () => {
    mockGet.mockResolvedValue({
      ...OPEN_RITUAL,
      closed: true,
      preview: null,
      message: 'Nothing for tomorrow.',
    });

    const { result } = renderHook(() => useEveningCheckInQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.closed).toBe(true);
    expect(result.current.data?.preview).toBeNull();
    expect(result.current.data?.message).toBe('Nothing for tomorrow.');
  });
});

describe('eveningCheckIn: useCloseEveningCheckInMutation contract (POST /users/me/evening-check-in/, #46)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs { mood, note } to /users/me/evening-check-in/', async () => {
    mockPost.mockResolvedValue(CLOSE_RESPONSE);

    const { result } = renderHook(() => useCloseEveningCheckInMutation(), { wrapper });
    result.current.mutate({ mood: 'good', note: 'kidney pain' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/users/me/evening-check-in/', {
      mood: 'good',
      note: 'kidney pain',
    });
  });

  it('trims the note and does not send a whitespace-only one', async () => {
    mockPost.mockResolvedValue(CLOSE_RESPONSE);
    const { result } = renderHook(() => useCloseEveningCheckInMutation(), { wrapper });

    result.current.mutate({ mood: 'good', note: '  kidney pain \n' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost.mock.calls[0][1]).toEqual({ mood: 'good', note: 'kidney pain' });

    mockPost.mockClear();
    result.current.mutate({ mood: 'good', note: '   \n ' });
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost.mock.calls[0][1]).toEqual({ mood: 'good' });
  });

  it('omits an empty note rather than sending null', async () => {
    mockPost.mockResolvedValue({
      check_in: { local_date: '2026-10-05', mood: 'rough', closed: true },
      preview: null,
      message: 'Nothing for tomorrow.',
    });

    const { result } = renderHook(() => useCloseEveningCheckInMutation(), { wrapper });
    result.current.mutate({ mood: 'rough', note: '' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, body] = mockPost.mock.calls[0];
    expect(body.note).toBeUndefined();
    expect(body).not.toHaveProperty('note', null);
  });

  it('returns the parsed close response', async () => {
    mockPost.mockResolvedValue(CLOSE_RESPONSE);

    const { result } = renderHook(() => useCloseEveningCheckInMutation(), { wrapper });
    result.current.mutate({ mood: 'good', note: '' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CLOSE_RESPONSE);
  });

  it('invalidates eveningCheckInKeys.all on success so the screen refetches (plan.md Decision 8)', async () => {
    mockPost.mockResolvedValue(CLOSE_RESPONSE);
    mockGet.mockResolvedValue(OPEN_RITUAL);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCloseEveningCheckInMutation(), {
      wrapper: wrapperWithClient(client),
    });
    result.current.mutate({ mood: 'good', note: '' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: eveningCheckInKeys.all }),
    );
  });

  it('rejects on a 400 and does not invalidate the query', async () => {
    mockPost.mockRejectedValue(new Error('Pick Rough, Meh, Okay, Good, or Great.'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCloseEveningCheckInMutation(), {
      wrapper: wrapperWithClient(client),
    });
    result.current.mutate({ mood: 'fine' as never, note: '' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
