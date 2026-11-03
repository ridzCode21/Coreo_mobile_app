/**
 * Issue #174 — "Add the same circle to the pillar header `trailing` slot (`PillarHeader`) on Diet,
 * Fitness and Wellness homes." `PillarHeader` is the one shared chrome used by the Fitness (16b)
 * and Wellness (17b) homes; this protects the header itself so every pillar screen that renders it
 * gets the circle for free (plan.md Decision log #1/#4). Diet's own hand-rolled header is covered
 * separately in `diet-home-screen.test.tsx`, since `DietHomeScreen` does not use `PillarHeader`.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PillarHeader } from '@/shared/components/PillarHeader';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('shared: PillarHeader profile circle (issue #174)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('always shows the profile circle, even with no extra trailing content', () => {
    render(<PillarHeader eyebrow="Diet" onBack={jest.fn()} firstName="Priya" />);
    expect(screen.getByText('P')).toBeTruthy();
    expect(screen.getByLabelText('Your profile')).toBeTruthy();
  });

  it('keeps the existing trailing content (e.g. the Fitness week chip) next to the circle, not replaced by it', () => {
    render(
      <PillarHeader
        eyebrow="Fitness"
        onBack={jest.fn()}
        firstName="Priya"
        trailing={<Text>Week 3 · Day 2</Text>}
      />,
    );
    expect(screen.getByText('Week 3 · Day 2')).toBeTruthy();
    expect(screen.getByLabelText('Your profile')).toBeTruthy();
  });

  it('tapping the circle opens Profile', () => {
    render(<PillarHeader eyebrow="Wellness" onBack={jest.fn()} firstName="Priya" />);
    fireEvent.press(screen.getByLabelText('Your profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('still calls onBack from the back chevron, unaffected by the circle', () => {
    const onBack = jest.fn();
    render(<PillarHeader eyebrow="Diet" onBack={onBack} firstName="Priya" />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
