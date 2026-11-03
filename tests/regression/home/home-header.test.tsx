/**
 * Issue #17 — the home header row (design-spec.md 24b/10a header: wave mark + "coreo" wordmark on
 * the left, the date on the right). `CoreoHomeScreen` had no date and a centred uppercase "Coreo"
 * label instead (issue current-behavior, `CoreoHomeScreen.tsx:91`, `:283-288` pre-fix). This test
 * protects the new shared `HomeHeader` in isolation from the rest of the screen.
 *
 * Issue #174 — every Home design (24b/10a/10b/23a/25c) also shows a 36px profile circle right of
 * the date, opening `/profile` (issue current-behavior: no way to reach Profile anywhere in the
 * app). `HomeHeader` now takes `firstName` and renders the shared `ProfileCircle` with it.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { HomeHeader } from '@/features/home/components/HomeHeader';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('home: HomeHeader', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

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

  it('shows the profile circle with the first initial, right of the date (issue #174)', () => {
    render(<HomeHeader now={new Date(2026, 6, 6)} firstName="sagar" />);
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByLabelText('Your profile')).toBeTruthy();
  });

  it('shows a neutral profile circle with no letter when the name has not loaded yet (issue #174)', () => {
    render(<HomeHeader now={new Date(2026, 6, 6)} />);
    expect(screen.getByLabelText('Your profile')).toBeTruthy();
    expect(screen.queryByText('S')).toBeNull();
  });

  it('opens Profile when the circle is tapped (issue #174)', () => {
    render(<HomeHeader now={new Date(2026, 6, 6)} firstName="sagar" />);
    fireEvent.press(screen.getByLabelText('Your profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });
});
