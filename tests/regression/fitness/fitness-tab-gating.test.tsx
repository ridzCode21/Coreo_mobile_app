/**
 * Issue #39/#40 — the Fitness tab gate (`FitnessHomeScreen`): loading/error states and the redirect
 * into the five-question interview when `fitness_interview_complete` is false. As of #40 the
 * "complete" case renders the real training-week content (16b) instead of the issue-#21 "coming
 * soon" placeholder, which this issue removes on purpose (plan.md Decision 1) — the detailed
 * content assertions for that screen live in `fitness-home-screen.test.tsx`; this file only
 * protects the gate itself (does it redirect, does it crash, does it flash the wrong thing).
 */

import { render, screen } from '@testing-library/react-native';

import FitnessTab from '@/app/(app)/(tabs)/fitness';
import * as fitnessProfileApi from '@/features/fitness/api/fitnessProfileApi';
import * as trainingWeekApi from '@/features/fitness/api/trainingWeekApi';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
}));

jest.mock('@/shared/components/WaveChart', () => ({ WaveChart: jest.fn(() => null) }));

jest.mock('@/features/fitness/api/fitnessProfileApi');
jest.mock('@/features/fitness/api/trainingWeekApi');

function mockQuery(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (fitnessProfileApi.useFitnessProfileQuery as jest.Mock).mockReturnValue(state);
}

function mockTrainingWeek(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (trainingWeekApi.useTrainingWeekQuery as jest.Mock).mockReturnValue(state);
}

describe('fitness tab: gates on the interview (#39/#40)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrainingWeek({ isLoading: false, isError: false, data: { training_week: null } });
  });

  it('shows a loading state while the profile is loading, not a flash of the wrong screen', () => {
    mockQuery({ isLoading: true, isError: false, data: undefined });

    render(<FitnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows an inline error state on a query error', () => {
    mockQuery({ isLoading: false, isError: true, data: undefined });

    render(<FitnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText(/couldn.t|something went wrong|try again/i)).toBeTruthy();
  });

  it('redirects to the fitness interview when the profile is incomplete', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { fitness_interview_complete: false },
    });

    render(<FitnessTab />);

    expect(mockReplace).toHaveBeenCalledWith('/fitness-interview');
  });

  it('renders the real training-week content once the interview is complete, not the old placeholder', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { fitness_interview_complete: true },
    });
    mockTrainingWeek({
      isLoading: false,
      isError: false,
      data: {
        training_week: {
          position: { week: 1, day: 1, label: 'Week 1 · Day 1' },
          status: 'in_progress',
          summary: 'Build muscle · dumbbells at home · 3 days',
          sessions: [],
          today: null,
        },
      },
    });

    render(<FitnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Workout logging is next.')).toBeNull();
    expect(screen.getByText('Week 1 · Day 1')).toBeTruthy();
  });
});
