/**
 * Issue #39 — the Fitness tab gate (`FitnessHomeScreen`, plan decision 6): loading/error states,
 * redirect into the five-question interview when `fitness_interview_complete` is false, and the
 * existing issue #21 placeholder once the profile is complete (not a fabricated "training week"
 * screen — plan decision 5).
 */

import { render, screen } from '@testing-library/react-native';

import FitnessTab from '@/app/(app)/(tabs)/fitness';
import * as fitnessProfileApi from '@/features/fitness/api/fitnessProfileApi';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

jest.mock('@/shared/components/WaveChart', () => ({ WaveChart: jest.fn(() => null) }));

jest.mock('@/features/fitness/api/fitnessProfileApi');

function mockQuery(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (fitnessProfileApi.useFitnessProfileQuery as jest.Mock).mockReturnValue(state);
}

describe('fitness tab: gates on the interview (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while the profile is loading, not a flash of the wrong screen', () => {
    mockQuery({ isLoading: true, isError: false, data: undefined });

    render(<FitnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Workout logging is next.')).toBeNull();
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

  it('renders the existing placeholder once the interview is complete', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { fitness_interview_complete: true },
    });

    render(<FitnessTab />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Workout logging is next.')).toBeTruthy();
  });
});
