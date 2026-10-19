/**
 * Issue #44 acceptance criterion: "Export and delete work and ask for a clear confirmation."
 * Backend: `GET /users/me/data/export/`, `DELETE /users/me/data/`, `DELETE /users/me/`
 * (`apps/users/api/views/profile.py:167-189`). `AccountActionsSection` is the new component that
 * renders these three actions (no design for them exists — plan.md Decision 7/8/9). Confirmation
 * uses `Alert.alert` (RN built-in, no new dependency); export uses `Share.share` (RN built-in) to
 * hand the exported JSON to the OS share sheet, since there's no `expo-file-system`/`expo-sharing`
 * dependency in this project and adding one is out of scope for this issue.
 */

import { Alert, Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';

const mockExportMutate = jest.fn();
const mockDeleteDataMutate = jest.fn();
const mockDeleteAccountMutate = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: mockDeleteDataMutate, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

function pressConfirmButton(alertSpy: jest.SpyInstance, wantedText: RegExp) {
  const lastCall = alertSpy.mock.calls.at(-1);
  if (!lastCall) throw new Error('Alert.alert was never called');
  const buttons = lastCall[2] as { text?: string; onPress?: () => void }[];
  const button = buttons.find((candidate) => candidate.text && wantedText.test(candidate.text));
  if (!button?.onPress) throw new Error(`No confirm button matching ${wantedText}`);
  button.onPress();
}

describe('profile: AccountActionsSection (issue #44)', () => {
  let alertSpy: jest.SpyInstance;
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mockExportMutate.mockClear();
    mockDeleteDataMutate.mockClear();
    mockDeleteAccountMutate.mockClear();
    mockSignOut.mockClear();
  });

  afterEach(() => {
    alertSpy.mockRestore();
    shareSpy.mockRestore();
  });

  it('asks for confirmation before exporting, and does nothing until confirmed', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));

    expect(alertSpy).toHaveBeenCalled();
    expect(mockExportMutate).not.toHaveBeenCalled();
  });

  it('shares the exported payload only after the export is confirmed', () => {
    mockExportMutate.mockImplementation((_arg, options) => {
      options?.onSuccess?.({ schema_version: 1, account: { id: 'u1' } });
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    pressConfirmButton(alertSpy, /export/i);

    expect(mockExportMutate).toHaveBeenCalled();
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('schema_version') }),
    );
  });

  it('asks for confirmation before deleting data, and does nothing until confirmed', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my data' }));

    expect(alertSpy).toHaveBeenCalled();
    expect(mockDeleteDataMutate).not.toHaveBeenCalled();
  });

  it('calls DELETE /users/me/data/ only after the delete-data confirmation is accepted', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my data' }));
    pressConfirmButton(alertSpy, /delete/i);

    expect(mockDeleteDataMutate).toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('asks a destructive, "cannot be undone" confirmation before deleting the account', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    const lastCall = alertSpy.mock.calls.at(-1);
    const [, message] = lastCall as [string, string];
    expect(message).toMatch(/cannot be undone/i);
  });

  it('signs the user out only after the delete-account confirmation succeeds', () => {
    mockDeleteAccountMutate.mockImplementation((_arg, options) => {
      options?.onSuccess?.();
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    pressConfirmButton(alertSpy, /delete/i);

    expect(mockDeleteAccountMutate).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
