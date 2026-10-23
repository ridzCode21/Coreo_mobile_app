/**
 * Issue #47 — the signed-in layout host: shows our explanation only for `step_in` and an unasked
 * system, asks the system only after confirm, registers the phone when allowed (and when it was
 * already allowed), and leaves no dead end when declined or refused.
 */

import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { CheckInNotificationsHost } from '@/features/notifications/components/CheckInNotificationsHost';
import { PERMISSION_EXPLANATION } from '@/features/notifications/lib/permissionPrompt';
import { apiClient } from '@/shared/api/client';
import { STORAGE_KEYS } from '@/shared/lib/storage';

jest.mock('@/shared/api/client', () => ({
  apiClient: {
    post: jest.fn(async (_path: string, body: { token: string; platform: string }) => ({
      id: 'row-1',
      platform: body.platform,
      token: body.token,
      created_at: '2026-07-07T00:00:00Z',
      updated_at: '2026-07-07T00:00:00Z',
    })),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));

let mockStyle = 'step_in';
jest.mock('@/features/wellness', () => ({
  useWellnessProfileQuery: () => ({ data: { check_in_style: mockStyle } }),
}));

// The sheet is a slide-in Modal: closing takes its animation time, which can pass the 1 s default
// under load. This waits for that animation, it does not hide a real failure.
const SHEET_CLOSE_TIMEOUT_MS = 4000;

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockRegister = apiClient.post as jest.Mock;

function renderHost() {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<CheckInNotificationsHost />, { wrapper: Wrapper });
}

const undetermined = { granted: false, canAskAgain: true, status: 'undetermined' };
const granted = { granted: true, canAskAgain: true, status: 'granted' };
const denied = { granted: false, canAskAgain: false, status: 'denied' };

describe('CheckInNotificationsHost', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStyle = 'step_in';
    getPermissions.mockResolvedValue(undetermined);
    await AsyncStorage.clear();
  });

  it('shows the explanation first and does not ask the system yet', async () => {
    renderHost();
    expect(await screen.findByText(PERMISSION_EXPLANATION)).toBeTruthy();
    expect(requestPermissions).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('asks the system after confirm, then registers this phone with the Expo token', async () => {
    renderHost();
    fireEvent.press(await screen.findByRole('button', { name: 'Allow the nudge' }));
    await waitFor(() => expect(requestPermissions).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('/users/me/device-tokens/', {
        token: 'ExponentPushToken[test]',
        platform: 'ios',
      }),
    );
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'test-project-id',
    });
    await waitFor(() => expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull(), {
      timeout: SHEET_CLOSE_TIMEOUT_MS,
    });
  });

  it('decline closes the sheet, never asks the system, and is remembered', async () => {
    renderHost();
    fireEvent.press(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull(), {
      timeout: SHEET_CLOSE_TIMEOUT_MS,
    });
    expect(requestPermissions).not.toHaveBeenCalled();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEYS.checkInPromptDeclined)).toBe('true'),
    );
  });

  it('does not show the sheet again after an earlier no', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.checkInPromptDeclined, 'true');
    renderHost();
    await act(async () => undefined);
    expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull();
  });

  it('a system refusal closes the sheet and registers nothing', async () => {
    requestPermissions.mockResolvedValueOnce(denied);
    renderHost();
    fireEvent.press(await screen.findByRole('button', { name: 'Allow the nudge' }));
    await waitFor(() => expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull(), {
      timeout: SHEET_CLOSE_TIMEOUT_MS,
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows nothing for only_when_i_come', async () => {
    mockStyle = 'only_when_i_come';
    renderHost();
    await act(async () => undefined);
    expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull();
  });

  it('registers quietly, with no sheet, when notifications were already allowed', async () => {
    getPermissions.mockResolvedValue(granted);
    renderHost();
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('stays quiet when the system refused earlier', async () => {
    getPermissions.mockResolvedValue(denied);
    renderHost();
    await act(async () => undefined);
    expect(screen.queryByText(PERMISSION_EXPLANATION)).toBeNull();
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
