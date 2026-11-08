/**
 * Issue #56 — "A 'Connect with Strava' button that follows Strava's brand guidelines" (issue body).
 * No official Strava button asset ships in `designs/` or this repo and the pipeline cannot reach
 * the network to fetch one (plan.md Decision log), so this renders Strava's documented brand
 * color (`#FC4C02`, `colors.stravaOrange`) and exact wordmark text instead of a bitmap — flagged to
 * the owner to swap for the real asset. Height matches Strava's 48px brand-button spec
 * (`componentSizes.stravaConnectButtonHeight`).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { StravaConnectButton } from '@/features/integrations/components/StravaConnectButton';
import { colors, componentSizes } from '@/shared/theme/tokens';

describe('StravaConnectButton (issue #56)', () => {
  it('shows the exact "Connect with Strava" copy as an accessible button', () => {
    render(<StravaConnectButton onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Connect with Strava' });
    expect(button).toBeTruthy();
    expect(screen.getByText('Connect with Strava')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<StravaConnectButton onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Connect with Strava' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the Strava brand orange token and the 48px brand button height, not a hardcoded value', () => {
    render(<StravaConnectButton onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Connect with Strava' });
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style;
    expect(flatStyle.backgroundColor).toBe(colors.stravaOrange);
    expect(flatStyle.height).toBe(componentSizes.stravaConnectButtonHeight);
    expect(componentSizes.stravaConnectButtonHeight).toBe(48);
  });

  it('disables the button and stops taps while a connection attempt is already in flight', () => {
    const onPress = jest.fn();
    render(<StravaConnectButton onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Connect with Strava' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
