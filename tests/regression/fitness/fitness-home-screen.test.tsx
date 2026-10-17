/**
 * Issue #40 — 16b "Fitness home" (`design-spec.md:7-94`). `FitnessHomeScreen` replaces the
 * issue-#21/#39 "coming soon" placeholder once the interview is complete (plan.md Decision 1/11).
 * Mocks `useFitnessProfileQuery` (existing gate, unchanged) and `useTrainingWeekQuery` directly so
 * this is independent of the mock-router test (`training-week-mock.test.ts`).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import FitnessHomeScreen from '@/features/fitness/screens/FitnessHomeScreen';
import * as fitnessProfileApi from '@/features/fitness/api/fitnessProfileApi';
import * as trainingWeekApi from '@/features/fitness/api/trainingWeekApi';
import { glass } from '@/shared/theme/tokens';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
}));

jest.mock('@/features/fitness/api/fitnessProfileApi');
jest.mock('@/features/fitness/api/trainingWeekApi');

function mockProfile(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (fitnessProfileApi.useFitnessProfileQuery as jest.Mock).mockReturnValue(state);
}

function mockTrainingWeek(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (trainingWeekApi.useTrainingWeekQuery as jest.Mock).mockReturnValue(state);
}

const COMPLETE_PROFILE = { fitness_interview_complete: true };

const PUSH_SESSION = {
  key: 'push',
  name: 'Push: chest, shoulders, arms',
  weekday: 'tuesday',
  date: '2026-10-20',
  status: 'today',
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 4,
  note: null,
  progression_note:
    "Bench is +2.5 kg from last week. Same lifts, heavier, that's the plan working.",
  lighter_note:
    "Short sleep last night and cricket yesterday. I trimmed a set from each lift, you'll still progress.",
  exercises: [
    {
      key: 'dumbbell_bench_press',
      name: 'Dumbbell bench press',
      sets: 4,
      reps: 8,
      weight_kg: 22.5,
      superset: null,
      completed_sets: [],
    },
    {
      key: 'overhead_triceps',
      name: 'Overhead triceps',
      sets: 3,
      reps: 12,
      weight_kg: null,
      superset: 'arms',
      completed_sets: [],
    },
  ],
};

const FULL_WEEK = {
  training_week: {
    position: { week: 3, day: 2, label: 'Week 3 · Day 2' },
    status: 'in_progress',
    summary: 'Build muscle · dumbbells at home · 3 days · lower back protected',
    sessions: [PUSH_SESSION],
    today: PUSH_SESSION,
  },
};

describe('FitnessHomeScreen: gating (#40, unchanged from #39)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a loading state while the profile is loading', () => {
    mockProfile({ isLoading: true, isError: false, data: undefined });
    mockTrainingWeek({ isLoading: false, isError: false, data: undefined });

    render(<FitnessHomeScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to the fitness interview when the profile is incomplete', () => {
    mockProfile({ isLoading: false, isError: false, data: { fitness_interview_complete: false } });
    mockTrainingWeek({ isLoading: false, isError: false, data: undefined });

    render(<FitnessHomeScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/fitness-interview');
  });
});

describe('FitnessHomeScreen: training-week states (#40)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile({ isLoading: false, isError: false, data: COMPLETE_PROFILE });
  });

  it('shows a loading state while the training week is loading', () => {
    mockTrainingWeek({ isLoading: true, isError: false, data: undefined });

    render(<FitnessHomeScreen />);

    expect(screen.queryByText("Today's session")).toBeNull();
  });

  it('shows an inline error state on a training-week query error', () => {
    mockTrainingWeek({ isLoading: false, isError: true, data: undefined });

    render(<FitnessHomeScreen />);

    expect(screen.getByText(/couldn.t|something went wrong|try again/i)).toBeTruthy();
  });

  it('redirects to the interview when training_week is null (training_week.py:44-45, plan.md Decision 11)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: { training_week: null } });

    render(<FitnessHomeScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/fitness-interview');
  });

  it('rest day: no session, no invented workout, calm copy only (today: null)', () => {
    mockTrainingWeek({
      isLoading: false,
      isError: false,
      data: {
        training_week: {
          position: { week: 3, day: 7, label: 'Week 3 · Day 7' },
          status: 'complete',
          summary: 'Build muscle · dumbbells at home · 3 days',
          sessions: [],
          today: null,
        },
      },
    });

    render(<FitnessHomeScreen />);

    expect(screen.queryByText("Today's session")).toBeNull();
    expect(screen.queryByText('Start session')).toBeNull();
    expect(screen.queryByText('Already moved today? Tell me')).toBeNull();
    expect(screen.queryByText('Week 3 · Day 7')).toBeTruthy();
  });

  it('renders the full session card with API-sourced data only', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);

    expect(screen.getByText('Week 3 · Day 2')).toBeTruthy();
    expect(screen.getByText('Push: chest, shoulders, arms')).toBeTruthy();
    expect(screen.getByText("Today's session")).toBeTruthy();
    expect(screen.getByText('45 min · dumbbells')).toBeTruthy();
    expect(screen.getByText('Dumbbell bench press')).toBeTruthy();
    expect(screen.getByText('4 × 8 · 22.5 kg')).toBeTruthy();
    expect(screen.getByText('Overhead triceps')).toBeTruthy();
    expect(screen.getByText('3 × 12 superset')).toBeTruthy();
    expect(
      screen.getByText(
        "Bench is +2.5 kg from last week. Same lifts, heavier, that's the plan working.",
      ),
    ).toBeTruthy();
  });

  it('shows "Why today is lighter" only when lighter_note is present', () => {
    mockTrainingWeek({
      isLoading: false,
      isError: false,
      data: {
        training_week: {
          ...FULL_WEEK.training_week,
          today: { ...PUSH_SESSION, lighter_note: null },
        },
      },
    });

    render(<FitnessHomeScreen />);

    expect(screen.queryByText('Why today is lighter')).toBeNull();
  });

  it('shows "Why today is lighter" verbatim when lighter_note is present', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);

    expect(screen.getByText('Why today is lighter')).toBeTruthy();
    expect(
      screen.getByText(
        "Short sleep last night and cricket yesterday. I trimmed a set from each lift, you'll still progress.",
      ),
    ).toBeTruthy();
  });

  it('"Start session" and "Already moved today? Tell me" render but are not pressable buttons (plan.md Decision 4/5, PARTIAL)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);

    expect(screen.getByText('Start session')).toBeTruthy();
    expect(screen.getByText('Already moved today? Tell me')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start session/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /already moved/i })).toBeNull();
  });

  it('tapping the position chip navigates to /fitness/week', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);
    fireEvent.press(screen.getByText('Week 3 · Day 2'));

    expect(mockPush).toHaveBeenCalledWith('/fitness/week');
  });

  it('the back chevron calls router.back()', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);
    fireEvent.press(screen.getByRole('button', { name: /go back/i }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('the "Start session" card uses the chipSelected glass recipe, not chip (round-4 regression, plan.md Decision 7)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);

    const gradients = screen.UNSAFE_getAllByType(LinearGradient);
    const matchesChipSelected = gradients.some(
      (node) => JSON.stringify(node.props.colors) === JSON.stringify(glass.chipSelected.gradient),
    );
    expect(matchesChipSelected).toBe(true);
  });

  it('matches the designed glows on both action icons', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessHomeScreen />);

    const views = screen.UNSAFE_getAllByType(View);
    const playCircle = views.find((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.width === 42 && style?.backgroundColor === '#17191D';
    });
    const micCircle = views.find((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.width === 38 && style?.backgroundColor === '#FFFFFF';
    });

    expect(StyleSheet.flatten(playCircle?.props.style)).toMatchObject({
      shadowColor: 'rgba(8,24,44,0.35)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
    });
    expect(StyleSheet.flatten(micCircle?.props.style)).toMatchObject({
      shadowColor: 'rgba(255,255,255,0.7)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 16,
    });
  });
});
