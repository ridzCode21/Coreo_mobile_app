import { render, screen } from '@testing-library/react-native';

import { WaveChart } from '@/shared/components/WaveChart';
import FitnessTab from '@/app/(app)/(tabs)/fitness';
import WellnessTab from '@/app/(app)/(tabs)/wellness';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/shared/components/WaveChart', () => ({
  WaveChart: jest.fn(() => null),
}));

// Issue #39/#40: Fitness now gates on the interview and then renders the real training week.
// Stub both queries so this legacy route-level test keeps protecting its no-wave/no-internal-copy
// guarantee without duplicating the detailed Fitness screen tests.
jest.mock('@/features/fitness/api/fitnessProfileApi', () => ({
  useFitnessProfileQuery: () => ({
    data: { fitness_interview_complete: true },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/fitness/api/trainingWeekApi', () => ({
  useTrainingWeekQuery: () => ({
    data: {
      training_week: {
        position: { week: 1, day: 7, label: 'Week 1 · Day 7' },
        status: 'in_progress',
        summary: 'Build muscle · dumbbells at home · 3 days',
        sessions: [],
        today: null,
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('home: Fitness and Wellness tab routes (issue #21 — no made-up wave)', () => {
  it('Fitness tab never renders a wave chart and drops the internal "Phase 6" wording from its body copy', () => {
    render(<FitnessTab />);
    expect(WaveChart).not.toHaveBeenCalled();
    expect(screen.queryByText(/phase\s*\d/i)).toBeNull();
  });

  it('Wellness tab never renders a wave chart and has no internal phase wording', () => {
    render(<WellnessTab />);
    expect(WaveChart).not.toHaveBeenCalled();
    expect(screen.queryByText(/phase\s*\d/i)).toBeNull();
  });
});
