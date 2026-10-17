/**
 * Issue #51 — `PillarNotSelectedScreen` replaces `PillarComingSoonScreen` (issue #21's unwired
 * placeholder). The old component described an unbuilt future feature ("Workout logging is
 * next."); now that Fitness/Wellness are both live (#40/#42), the only reason either tab shows an
 * invitation is that *this user* didn't pick that pillar at signup — so the copy states that fact
 * plainly instead (plan.md Decision 6), reusing the same tokens/layout as before. No design
 * screen exists for this state (none of 7a·3/16b/17b is it) — labeled assumption, see plan.md.
 */

import { render, screen } from '@testing-library/react-native';

import { WaveChart } from '@/shared/components/WaveChart';
import PillarNotSelectedScreen from '@/features/home/screens/PillarNotSelectedScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/components/WaveChart', () => ({
  WaveChart: jest.fn(() => null),
}));

describe('home: PillarNotSelectedScreen (issue #51)', () => {
  it('shows the Fitness eyebrow, title, and body for a pillar not picked at signup', () => {
    render(<PillarNotSelectedScreen pillar="Fitness" />);

    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText("Fitness isn't part of your plan yet.")).toBeTruthy();
    expect(screen.getByText('Not chosen at signup')).toBeTruthy();
    expect(
      screen.getByText(
        "You picked other pillars when you signed up, so I never asked Fitness questions. There's nothing to show here yet.",
      ),
    ).toBeTruthy();
  });

  it('shows the Wellness eyebrow, title, and body for a pillar not picked at signup', () => {
    render(<PillarNotSelectedScreen pillar="Wellness" />);

    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText("Wellness isn't part of your plan yet.")).toBeTruthy();
    expect(
      screen.getByText(
        "You picked other pillars when you signed up, so I never asked Wellness questions. There's nothing to show here yet.",
      ),
    ).toBeTruthy();
  });

  it('never renders a wave chart (no invented progress)', () => {
    render(<PillarNotSelectedScreen pillar="Fitness" />);
    expect(WaveChart).not.toHaveBeenCalled();
  });

  it('never shows an invented day/number count', () => {
    render(<PillarNotSelectedScreen pillar="Wellness" />);
    expect(screen.queryByText(/\d+\s*(day|days|%|kg)/i)).toBeNull();
  });

  it('still renders the "Back to Coreo" action', () => {
    render(<PillarNotSelectedScreen pillar="Fitness" />);
    expect(screen.getByRole('button', { name: 'Back to Coreo' })).toBeTruthy();
  });
});
