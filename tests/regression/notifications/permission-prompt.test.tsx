/**
 * Issue #47 — our own explanation comes before the system prompt. The system asks only after the
 * person taps the confirm button; declining or a refusal leaves the app working with no dead end.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import {
  PERMISSION_EXPLANATION,
  shouldShowPermissionPrompt,
} from '@/features/notifications/lib/permissionPrompt';
import { CheckInPermissionSheet } from '@/features/notifications/components/CheckInPermissionSheet';
import { requestPushPermission } from '@/features/notifications/lib/expoPush';

describe('permission prompt rules', () => {
  const ask = { checkInStyle: 'step_in', permission: 'undetermined', declined: false } as const;

  it('uses the owner wording exactly', () => {
    expect(PERMISSION_EXPLANATION).toBe(
      'Coreo can send one nudge at 9 PM: twenty seconds to say how today felt. Nothing else.',
    );
  });

  it('asks only for step_in, when the system has not been asked, and not after a no', () => {
    expect(shouldShowPermissionPrompt(ask)).toBe(true);
    expect(shouldShowPermissionPrompt({ ...ask, checkInStyle: 'only_when_i_come' })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, checkInStyle: '' })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, checkInStyle: undefined })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, permission: 'granted' })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, permission: 'denied' })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, permission: null })).toBe(false);
    expect(shouldShowPermissionPrompt({ ...ask, declined: true })).toBe(false);
  });
});

describe('CheckInPermissionSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the explanation with a confirm button and a plain decline', () => {
    render(
      <CheckInPermissionSheet visible busy={false} onConfirm={jest.fn()} onDecline={jest.fn()} />,
    );
    expect(screen.getByText(PERMISSION_EXPLANATION)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Allow the nudge' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy();
  });

  it('does not touch the system prompt just by showing, and decline does not ask', () => {
    const onDecline = jest.fn();
    render(
      <CheckInPermissionSheet visible busy={false} onConfirm={jest.fn()} onDecline={onDecline} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('confirm calls back once', () => {
    const onConfirm = jest.fn();
    render(
      <CheckInPermissionSheet visible busy={false} onConfirm={onConfirm} onDecline={jest.fn()} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Allow the nudge' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('requestPushPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns granted when the system allows it', async () => {
    await expect(requestPushPermission()).resolves.toBe('granted');
  });

  it('returns denied (not an error) when the system refuses', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
      status: 'denied',
      expires: 'never',
    });
    await waitFor(async () => expect(await requestPushPermission()).toBe('denied'));
  });
});
