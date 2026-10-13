import { render, screen } from '@testing-library/react-native';

import { WaveChart } from '@/shared/components/WaveChart';
import FitnessTab from '@/app/(app)/(tabs)/fitness';
import WellnessTab from '@/app/(app)/(tabs)/wellness';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/components/WaveChart', () => ({
  WaveChart: jest.fn(() => null),
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
