/**
 * Issue #41 — the Wellness tab gate (`WellnessHomeScreen`): loading/error states and the redirect
 * into the five-question interview when `wellness_interview_complete` is false. Mirrors
 * `fitness/fitness-tab-gating.test.tsx` (pre-#40 shape, commit `affd6d0`): once complete, this
 * tab still renders the existing issue-#21 "coming soon" placeholder on purpose (plan.md
 * decision 3) — a real Wellness home (design screen 17b) is out of this issue's scope.
 */

import { render, screen } from '@testing-library/react-native';

import WellnessTab from '@/app/(app)/(tabs)/wellness';
import * as wellnessProfileApi from '@/features/wellness/api/wellnessProfileApi';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

jest.mock('@/features/wellness/api/wellnessProfileApi');

function mockQuery(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (wellnessProfileApi.useWellnessProfileQuery as jest.Mock).mockReturnValue(state);
}

describe('wellness tab: gates on the interview (#41)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while the profile is loading, not a flash of the wrong screen', () => {
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

  it('redirects to the wellness interview when the profile is incomplete', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { wellness_interview_complete: false },
    });

    render(<WellnessTab />);

    expect(mockReplace).toHaveBeenCalledWith('/wellness-interview');
  });

  it('renders the existing coming-soon placeholder once the interview is complete, not a fabricated wellness home', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { wellness_interview_complete: true },
    });

    render(<WellnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Wellness logging is next.')).toBeTruthy();
  });
});
