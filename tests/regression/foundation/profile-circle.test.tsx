/**
 * Issue #174 — "Profile circle: open Profile from every Home and pillar header". There is no way
 * to open `/profile` from anywhere in the app (issue current-behavior). The design
 * (`design-spec.md`/`Coreo App Screens.dc.html` 24b/10a/10b/23a/25c/14a, all identical) shows a
 * 36px circle with the first letter of the user's first name, right of the date/eyebrow, linking
 * to `#19a` (Profile): `<a href="#19a" style="...width:36px;height:36px;border-radius:50%;
 * background:linear-gradient(150deg,rgba(34,66,102,.7),rgba(12,28,48,.8));...">S</a>`. This new
 * shared `ProfileCircle` is the one reusable implementation used by the Home header and all three
 * pillar headers (plan.md Decision log #4) — presentational only (`firstName` passed in as a prop,
 * not fetched here, per the shared/features import direction in `react-native-architecture`).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProfileCircle } from '@/shared/components/ProfileCircle';
import { componentSizes } from '@/shared/theme/tokens';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('shared: ProfileCircle (issue #174)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows the uppercased first letter of the first name', () => {
    render(<ProfileCircle firstName="sagar" />);
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('uses the first non-whitespace character as the initial', () => {
    render(<ProfileCircle firstName="  sagar" />);
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('shows a neutral circle with no letter when the name is not loaded yet', () => {
    render(<ProfileCircle firstName={undefined} />);
    expect(screen.getByLabelText('Your profile')).toBeTruthy();
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('also shows no letter for a null or empty first name', () => {
    render(<ProfileCircle firstName={null} />);
    expect(screen.queryByText(/./)).toBeNull();
    render(<ProfileCircle firstName="" />);
    expect(screen.queryAllByText(/./)).toEqual([]);
  });

  it('has the "Your profile" accessibility label and a button role', () => {
    render(<ProfileCircle firstName="Asha" />);
    const button = screen.getByLabelText('Your profile');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('opens Profile on tap', () => {
    render(<ProfileCircle firstName="Asha" />);
    fireEvent.press(screen.getByLabelText('Your profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('expands the 36px visual circle to a 44pt tap target with hitSlop', () => {
    render(<ProfileCircle firstName="Asha" />);
    const button = screen.getByLabelText('Your profile');
    const slopEachSide = (componentSizes.minimumTapTarget - componentSizes.profileCircle) / 2;
    expect(button.props.hitSlop).toBeGreaterThanOrEqual(slopEachSide);
  });
});
