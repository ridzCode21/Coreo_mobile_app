/**
 * Issue #42 — `useRightNowCheck` (plan.md Decision 7): the global "check 17c on app open and on
 * foreground" hook, mounted once at `(app)/_layout.tsx`. There is no push for this (issue text,
 * backend issue vipin4250/Self_dev#55 is Phase 2 live triggers) — the only two signals are mount
 * and the OS's documented foreground signal, `AppState` moving to `'active'`
 * (https://reactnative.dev/docs/appstate).
 */

import { renderHook } from '@testing-library/react-native';

import * as rightNowApi from '@/features/wellness/api/rightNowApi';
import { useRightNowCheck } from '@/features/wellness/lib/useRightNowCheck';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let appStateListener: ((state: string) => void) | undefined;
const mockRemove = jest.fn();
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      ...actual.AppState,
      addEventListener: jest.fn((event: string, listener: (state: string) => void) => {
        if (event === 'change') appStateListener = listener;
        return { remove: mockRemove };
      }),
    },
  };
});

const mockRefetch = jest.fn();
jest.mock('@/features/wellness/api/rightNowApi', () => ({
  useRightNowQuery: jest.fn(),
}));

function mockQuery(data: unknown) {
  (rightNowApi.useRightNowQuery as jest.Mock).mockReturnValue({ data, refetch: mockRefetch });
}

describe('useRightNowCheck (#42)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = undefined;
  });

  it('does not navigate when breath is null', () => {
    mockQuery({ breath: null, message: 'Nothing to do.' });

    renderHook(() => useRightNowCheck());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not navigate while the query has no data yet', () => {
    mockQuery(undefined);

    renderHook(() => useRightNowCheck());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to /right-now when breath is non-null', () => {
    mockQuery({ breath: { eyebrow: 'Right now' } });

    renderHook(() => useRightNowCheck());

    expect(mockPush).toHaveBeenCalledWith('/right-now');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('does not push a second time on a re-render while the same breath is still present (no stacked modals)', () => {
    mockQuery({ breath: { eyebrow: 'Right now' } });

    const { rerender } = renderHook(() => useRightNowCheck());
    rerender({});

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('pushes again if breath clears and a new spike appears later', () => {
    mockQuery({ breath: { eyebrow: 'Right now' } });
    const { rerender } = renderHook(() => useRightNowCheck());
    expect(mockPush).toHaveBeenCalledTimes(1);

    mockQuery({ breath: null });
    rerender({});

    mockQuery({ breath: { eyebrow: 'Right now' } });
    rerender({});

    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('registers an AppState "change" listener on mount', () => {
    mockQuery({ breath: null });

    renderHook(() => useRightNowCheck());

    expect(appStateListener).toBeDefined();
  });

  it('refetches when AppState transitions to "active" (foreground, no push needed)', () => {
    mockQuery({ breath: null });

    renderHook(() => useRightNowCheck());
    appStateListener?.('active');

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('does not refetch on a transition to "background" or "inactive"', () => {
    mockQuery({ breath: null });

    renderHook(() => useRightNowCheck());
    appStateListener?.('background');
    appStateListener?.('inactive');

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('removes the AppState subscription on unmount', () => {
    mockQuery({ breath: null });

    const { unmount } = renderHook(() => useRightNowCheck());
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });
});
