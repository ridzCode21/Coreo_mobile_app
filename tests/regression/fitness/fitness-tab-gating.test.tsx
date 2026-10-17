/**
 * Issue #39/#40 — the Fitness tab gate (`FitnessHomeScreen`): loading/error states and the redirect
 * into the five-question interview when `fitness_interview_complete` is false. As of #40 the
 * "complete" case renders the real training-week content (16b) instead of the issue-#21 "coming
 * soon" placeholder, which this issue removes on purpose (plan.md Decision 1) — the detailed
 * content assertions for that screen live in `fitness-home-screen.test.tsx`; this file only
 * protects the gate itself (does it redirect, does it crash, does it flash the wrong thing).
 *
 * Issue #51 adds a gate *in front of* this one: the interview/training-week queries must not even
 * fire for a user who didn't pick Fitness at signup (`usePillarSelectionStore`, plan.md Decision
 * 3/7) — they see `PillarNotSelectedScreen` instead. `beforeEach` seeds `fitness` as selected and
 * hydrated so every pre-#51 case below keeps exercising the interview gate unchanged; the new
 * `describe` block covers the pillar gate itself.
 */

import { render, screen } from '@testing-library/react-native';

import FitnessTab from '@/app/(app)/(tabs)/fitness';
import * as fitnessProfileApi from '@/features/fitness/api/fitnessProfileApi';
import * as trainingWeekApi from '@/features/fitness/api/trainingWeekApi';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';

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
    usePillarSelectionStore.setState({ activePillars: ['fitness'], hasHydrated: true });
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

describe('fitness tab: gates on the picked pillar first (#51)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrainingWeek({ isLoading: false, isError: false, data: { training_week: null } });
  });

  it('shows the not-selected invitation, never queries the profile, when Fitness was not picked', () => {
    usePillarSelectionStore.setState({ activePillars: ['wellness'], hasHydrated: true });
    mockQuery({ isLoading: false, isError: false, data: { fitness_interview_complete: true } });

    render(<FitnessTab />);

    expect(screen.getByText("Fitness isn't part of your plan yet.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(fitnessProfileApi.useFitnessProfileQuery).toHaveBeenCalledWith(false);
    expect(trainingWeekApi.useTrainingWeekQuery).toHaveBeenCalledWith(false);
  });

  it('shows a loading state, not the invitation, while pillar selection has not hydrated yet', () => {
    usePillarSelectionStore.setState({ activePillars: [], hasHydrated: false });
    mockQuery({ isLoading: false, isError: false, data: { fitness_interview_complete: true } });

    render(<FitnessTab />);

    expect(screen.queryByText("Fitness isn't part of your plan yet.")).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('queries the profile and proceeds as normal once Fitness is a selected, hydrated pillar', () => {
    usePillarSelectionStore.setState({ activePillars: ['fitness'], hasHydrated: true });
    mockQuery({ isLoading: false, isError: false, data: { fitness_interview_complete: false } });

    render(<FitnessTab />);

    expect(fitnessProfileApi.useFitnessProfileQuery).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/fitness-interview');
  });
});
