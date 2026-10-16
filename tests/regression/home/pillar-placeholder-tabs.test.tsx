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

// Issue #39: the Fitness tab now gates on the fitness-profile interview before falling through to
// this same placeholder (`fitness-tab-gating.test.tsx` covers that gate itself) — stub the query
// as already-complete so this file keeps testing exactly what it always tested: the placeholder's
// own copy/no-wave guarantee, not the new gating.
jest.mock('@/features/fitness/api/fitnessProfileApi', () => ({
  useFitnessProfileQuery: () => ({
    data: { fitness_interview_complete: true },
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
