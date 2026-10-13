import { render, screen } from '@testing-library/react-native';

import { WaveChart } from '@/shared/components/WaveChart';
import PillarComingSoonScreen from '@/features/home/screens/PillarComingSoonScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/components/WaveChart', () => ({
  WaveChart: jest.fn(() => null),
}));

describe('home: PillarComingSoonScreen (issue #21 — no made-up wave)', () => {
  const props = {
    pillar: 'Fitness' as const,
    title: 'Workout logging is next.',
    body: 'This tab is in the shell now so Coreo has somewhere real to connect training data once it is built.',
  };

  it('never renders a wave chart (no invented progress) on the Fitness placeholder', () => {
    render(<PillarComingSoonScreen {...props} />);
    expect(WaveChart).not.toHaveBeenCalled();
  });

  it('never renders a wave chart (no invented progress) on the Wellness placeholder', () => {
    render(
      <PillarComingSoonScreen
        pillar="Wellness"
        title="Wellness logging is next."
        body="Water is already part of the daily summary. Sleep, HRV, and steps stay read-only until the backend supports manual updates."
      />,
    );
    expect(WaveChart).not.toHaveBeenCalled();
  });

  it('does not show the internal "Phase 6" label', () => {
    render(<PillarComingSoonScreen {...props} />);
    expect(screen.queryByText(/phase\s*\d/i)).toBeNull();
  });

  it('does not show the internal "No fake data." dev note', () => {
    render(<PillarComingSoonScreen {...props} />);
    expect(screen.queryByText('No fake data.')).toBeNull();
  });

  it('still renders the pillar name, title, and body copy passed in', () => {
    render(<PillarComingSoonScreen {...props} />);
    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText(/Workout logging is next\./)).toBeTruthy();
    expect(screen.getByText(props.body)).toBeTruthy();
  });

  it('still renders the "Back to Coreo" action', () => {
    render(<PillarComingSoonScreen {...props} />);
    expect(screen.getByRole('button', { name: 'Back to Coreo' })).toBeTruthy();
  });
});
