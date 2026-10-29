/**
 * Issue #133 — `GET /users/me/nudge/` (`apps/users/urls.py:57`, view
 * `apps/users/api/views/nudge.py:9-14`, service `apps/users/services/nudge.py`). Bare payload, no
 * Style A `{success, data}` wrapper (confirmed: the view does `Response(nudge_payload(...))`
 * directly — `nudge.py:14` — unlike the general "users app = Style A" convention in
 * `shared/api/mock/envelope.ts`). Three exact response shapes, per `nudge_payload`/`_nudge_card`/
 * `_empty_response` (`apps/users/services/nudge.py:37-41,57-60,88-100`):
 *   1. Onboarding incomplete or still calibrating: `{ "nudge": null, "message": null }`.
 *   2. Calibration complete, no rule fires: `{ "nudge": null, "message": "Nothing today." }`.
 *   3. A rule wins: `{ "nudge": { rule_id, domain, eyebrow, when_label, home_line, diet_line,
 *      title, body, time_label } }` — no `message` key at all when a nudge exists
 *      (`apps/users/test_nudge.py:160`: `assertNotIn("message", response.data)`), and `diet_line`
 *      is `string | null` (`nudge.py:89,96`).
 *
 * `useNudgeQuery` (new, `src/features/home/api/nudgeApi.ts`) must parse all three shapes without
 * throwing, since `CoreoHomeScreen` must show nothing (not crash) whenever there is no nudge.
 */

import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useNudgeQuery } from '@/features/home/api/nudgeApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

function wrapperWithClient(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function renderNudgeQuery() {
  return renderHook(() => useNudgeQuery(), {
    wrapper: wrapperWithClient(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
  });
}

describe('home nudgeApi contract: GET /users/me/nudge/ (issue #133)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses the onboarding/calibrating shape ({ nudge: null, message: null }) without throwing', async () => {
    mockGet.mockResolvedValue({ nudge: null, message: null });

    const { result } = renderNudgeQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ nudge: null, message: null });
  });

  it('parses the "nothing fired" shape ({ nudge: null, message: "Nothing today." }) without throwing', async () => {
    mockGet.mockResolvedValue({ nudge: null, message: 'Nothing today.' });

    const { result } = renderNudgeQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ nudge: null, message: 'Nothing today.' });
  });

  it('parses a real winning-rule card exactly, including a null diet_line for a non-diet rule', async () => {
    mockGet.mockResolvedValue({
      nudge: {
        rule_id: 'fitness_session_today',
        domain: 'fitness',
        eyebrow: 'Your core',
        when_label: 'Now',
        home_line: "Today's lift is queued. One set at a time.",
        diet_line: null,
        title: 'Session today',
        body: "Today's lift is queued. One set at a time.",
        time_label: 'now',
      },
    });

    const { result } = renderNudgeQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nudge?.home_line).toBe(
      "Today's lift is queued. One set at a time.",
    );
    expect(result.current.data?.nudge?.diet_line).toBeNull();
    expect(result.current.data).not.toHaveProperty('message');
  });

  it('parses the carb-rule shape with a real (non-null) diet_line', async () => {
    mockGet.mockResolvedValue({
      nudge: {
        rule_id: 'diet_carbs_before_session',
        domain: 'diet',
        eyebrow: 'Your core',
        when_label: 'Now',
        home_line: "Eat carbs in the next hour and tonight's session will feel easy.",
        diet_line: "Carbs before 5. That's the whole game today.",
        title: 'Good window to eat',
        body: "Carbs are low for tonight's session. Around 4:30 keeps it easy.",
        time_label: 'now',
      },
    });

    const { result } = renderNudgeQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nudge?.diet_line).toBe(
      "Carbs before 5. That's the whole game today.",
    );
  });

  it('calls the real endpoint path', async () => {
    mockGet.mockResolvedValue({ nudge: null, message: null });

    renderNudgeQuery();

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/users/me/nudge/'));
  });
});
