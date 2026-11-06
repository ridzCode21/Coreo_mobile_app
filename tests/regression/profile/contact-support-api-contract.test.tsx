/**
 * Issue #179 — `useSendSupportMessageMutation` contract against `POST /core/contact-support/`
 * (apps/core/views.py:121-151, serializers.py:21-31). Pattern mirrors
 * `evening-check-in-api-contract.test.tsx`: `apiClient` mocked directly so this protects the
 * hook's own request/response wiring, independent of the mock-router test
 * (`contact-support-mock-contract.test.ts`). The issue fixes `category` to `'support'` and
 * `attach_logs` to `false` — the hook, not the caller, must add them.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSendSupportMessageMutation } from '@/features/profile/api/contactSupportApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('profile: useSendSupportMessageMutation contract (issue #179)', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('posts subject, message, and the fixed category/attach_logs to /core/contact-support/', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: {
        support_request: {
          id: 'SR-20261106-1',
          subject: 'Photo logging crashes',
          category: 'support',
          submitted_at: '2026-11-06T10:00:00Z',
        },
      },
      message: 'Support request submitted successfully.',
    });

    const { result } = renderHook(() => useSendSupportMessageMutation(), { wrapper });

    result.current.mutate({
      subject: 'Photo logging crashes',
      message: 'The camera button closes the app.',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith('/core/contact-support/', {
      subject: 'Photo logging crashes',
      message: 'The camera button closes the app.',
      category: 'support',
      attach_logs: false,
    });
  });

  it('rejects when the response envelope does not match the backend contract', async () => {
    mockPost.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useSendSupportMessageMutation(), { wrapper });

    result.current.mutate({ subject: 'Hi', message: 'Hello' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
