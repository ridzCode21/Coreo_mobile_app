/**
 * Issue #42 — the Wellness tab gate (`WellnessHomeScreen`): loading/error states and the redirect
 * into the five-question interview when `GET /users/me/wind-down/` returns `wind_down: null`
 * (`wind_down.py:73-74`). As of #42 the "complete" case renders the real 17b content (this issue)
 * instead of the issue-#41 "coming soon" placeholder, which is removed on purpose — same
 * precedent as commit `df9a152` doing this for fitness in #40 (`fitness-tab-gating.test.tsx`).
 * The gate itself also moved: it used to read `useWellnessProfileQuery().wellness_interview_complete`
 * directly (#41); now `wind_down === null` already encodes that same completeness rule
 * server-side (plan.md Decision 1), so this file mocks `useWindDownQuery` instead. Detailed 17b
 * content assertions live in `wellness-home-screen.test.tsx`; this file only protects the gate
 * itself (does it redirect, does it crash, does it flash the wrong thing).
 */

import { render, screen } from '@testing-library/react-native';

import WellnessTab from '@/app/(app)/(tabs)/wellness';
import * as windDownApi from '@/features/wellness/api/windDownApi';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

jest.mock('@/features/wellness/api/windDownApi');

function mockQuery(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (windDownApi.useWindDownQuery as jest.Mock).mockReturnValue(state);
}

const FULL_WIND_DOWN = {
  wind_down: {
    clock: '9:12 PM',
    headline: 'Your day ran hot. Tonight we land it early.',
    title: "Tonight's wind-down",
    lights_out: '10:45',
    steps: [
      { time: '9:45', text: 'phone goes to the kitchen', reason: 'the 1 AM fix' },
      { time: '10:00', text: 'chai on the balcony, no screens', reason: 'yours already' },
      { time: '10:30', text: 'six slow breaths in bed', reason: '2 min, guided' },
    ],
    line: 'One routine, built from your interview. No library to scroll.',
    reason: 'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
    pushed: false,
  },
};

describe('wellness tab: gates on the interview via wind-down (#42)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while wind-down is loading, not a flash of the wrong screen', () => {
    mockQuery({ isLoading: true, isError: false, data: undefined });

    render(<WellnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows an inline error state on a query error', () => {
    mockQuery({ isLoading: false, isError: true, data: undefined });

    render(<WellnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
  });

  it('redirects to the wellness interview when wind_down is null', () => {
    mockQuery({ isLoading: false, isError: false, data: { wind_down: null } });

    render(<WellnessTab />);

    expect(mockReplace).toHaveBeenCalledWith('/wellness-interview');
  });

  it('renders the real 17b content once wind-down is available, not the old "coming soon" placeholder', () => {
    mockQuery({ isLoading: false, isError: false, data: FULL_WIND_DOWN });

    render(<WellnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Wellness logging is next.')).toBeNull();
    expect(screen.getByText("Tonight's wind-down")).toBeTruthy();
  });
});
