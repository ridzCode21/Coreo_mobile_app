/**
 * Issue #17 — the home header row (design-spec.md 24b/10a header: wave mark + "coreo" wordmark on
 * the left, the date on the right). `CoreoHomeScreen` had no date and a centred uppercase "Coreo"
 * label instead (issue current-behavior, `CoreoHomeScreen.tsx:91`, `:283-288` pre-fix). This test
 * protects the new shared `HomeHeader` in isolation from the rest of the screen.
 */

import { render, screen } from '@testing-library/react-native';

import { HomeHeader } from '@/features/home/components/HomeHeader';

describe('home: HomeHeader', () => {
  it('shows the lowercase "coreo" wordmark, not the old uppercase "Coreo" eyebrow', () => {
    render(<HomeHeader now={new Date(2026, 6, 6)} />);
    expect(screen.getByText('coreo')).toBeTruthy();
    expect(screen.queryByText('Coreo')).toBeNull();
  });

  it('shows the date formatted like the design ("Mon · Jul 6" for a real Monday in July)', () => {
    render(<HomeHeader now={new Date(2026, 6, 6)} />);
    expect(screen.getByText('Mon · Jul 6')).toBeTruthy();
  });

  it('updates the date text when given a different day', () => {
    render(<HomeHeader now={new Date(2026, 0, 15)} />);
    expect(screen.getByText('Thu · Jan 15')).toBeTruthy();
  });
});
