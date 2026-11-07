/**
 * Issue #44 acceptance criterion: "Export and delete work and ask for a clear confirmation."
 * Backend: `GET /users/me/data/export/`, `DELETE /users/me/data/`, `DELETE /users/me/`
 * (`apps/users/api/views/profile.py:167-189`). `AccountActionsSection` is the component that renders
 * these three actions. Delete my data / Delete my account keep their `Alert.alert` confirmation (RN
 * built-in, no new dependency) — untouched by issue #181.
 *
 * Issue #181 replaces Export's old `Alert.alert` + `Share.share`-as-text flow with the design's
 * `ExportDataSheet` (working/done/failed/offline states; see `export-data-sheet-copy.test.ts` and
 * `export-data-sheet.test.tsx` for the sheet's own copy/behavior contract, and `export-file.test.ts`
 * for the real file it produces). Export is read-only, so tapping "Export my data" opens the sheet
 * directly and starts the export immediately — the working row is the acknowledgement, there is no
 * separate `Alert.alert` confirmation step (plan.md Decision 6).
 */

import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';

const mockExportMutate = jest.fn();
const mockDeleteDataMutate = jest.fn();
const mockDeleteAccountMutate = jest.fn();
const mockSignOut = jest.fn();
const mockWriteExportFile = jest.fn();
const mockDownloadExportFile = jest.fn();
let mockIsOnline = true;

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: mockDeleteDataMutate, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

jest.mock('@/shared/stores/connectivityStore', () => ({
  useConnectivityStore: (selector: (state: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: mockIsOnline }),
}));

jest.mock('@/features/profile/lib/exportFile', () => ({
  writeExportFile: (...args: unknown[]) => mockWriteExportFile(...args),
  downloadExportFile: (...args: unknown[]) => mockDownloadExportFile(...args),
}));

// Issue #180 adds a "Sign out" action with its own router/connectivity/meal-queue wiring, covered by
// its own suite (tests/regression/profile/sign-out-action.test.tsx). Stub it here so this suite's
// Export/Delete-data/Delete-account assertions don't need those extra mocks.
jest.mock(
  '../../../src/features/profile/components/SignOutAction',
  () => ({ SignOutAction: () => null }),
  { virtual: true },
);

function pressConfirmButton(alertSpy: jest.SpyInstance, wantedText: RegExp) {
  const lastCall = alertSpy.mock.calls.at(-1);
  if (!lastCall) throw new Error('Alert.alert was never called');
  const buttons = lastCall[2] as { text?: string; onPress?: () => void }[];
  const button = buttons.find((candidate) => candidate.text && wantedText.test(candidate.text));
  if (!button?.onPress) throw new Error(`No confirm button matching ${wantedText}`);
  button.onPress();
}

describe('profile: AccountActionsSection — Export my data sheet (issue #181)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockExportMutate.mockReset();
    mockWriteExportFile.mockReset().mockResolvedValue({ uri: 'file:///mock/coreo-export.json' });
    mockDownloadExportFile.mockReset().mockResolvedValue(undefined);
    mockIsOnline = true;
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('opens the sheet directly and starts the export, with no Alert confirmation', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Putting your file together…')).toBeTruthy();
    expect(mockExportMutate).toHaveBeenCalledTimes(1);
  });

  it('shows the offline row and does not start the export when offline', () => {
    mockIsOnline = false;
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));

    expect(
      screen.getByText(
        "You're offline. Exporting your data needs a connection. Try when you're back online.",
      ),
    ).toBeTruthy();
    expect(mockExportMutate).not.toHaveBeenCalled();
  });

  it('shows the done row once the export succeeds', () => {
    mockExportMutate.mockImplementation((_arg, options) => {
      options?.onSuccess?.({ schema_version: 1, account: { id: 'u1' } });
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));

    expect(screen.getByText('Ready to download · coreo-export.json')).toBeTruthy();
  });

  it('shows the failed row when the export errors, and "Try again" retries it', () => {
    mockExportMutate.mockImplementationOnce((_arg, options) => {
      options?.onError?.(new Error('boom'));
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    expect(screen.getByText('Something went wrong. ')).toBeTruthy();

    mockExportMutate.mockImplementationOnce((_arg, options) => {
      options?.onSuccess?.({ schema_version: 1, account: { id: 'u1' } });
    });
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(mockExportMutate).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Ready to download · coreo-export.json')).toBeTruthy();
  });

  it('writes and downloads the real export file when Download is pressed in the done state', async () => {
    const payload = { schema_version: 1, account: { id: 'u1' } };
    mockExportMutate.mockImplementation((_arg, options) => {
      options?.onSuccess?.(payload);
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    fireEvent.press(screen.getByRole('button', { name: 'Download' }));

    expect(mockWriteExportFile).toHaveBeenCalledWith(payload);
    await waitFor(() =>
      expect(mockDownloadExportFile).toHaveBeenCalledWith({
        uri: 'file:///mock/coreo-export.json',
      }),
    );
  });

  it('closes the sheet without starting a new export when the secondary button is pressed', () => {
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Putting your file together…')).toBeNull();
  });

  it('reopening after a failure starts a fresh export, ignoring a late response from the abandoned attempt', () => {
    let firstAttemptOptions: { onSuccess?: (payload: unknown) => void } | undefined;
    mockExportMutate.mockImplementationOnce((_arg, options) => {
      firstAttemptOptions = options;
      // The first attempt never resolves synchronously — it is still in flight when closed.
    });
    render(<AccountActionsSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    mockExportMutate.mockImplementationOnce((_arg, options) => {
      options?.onError?.(new Error('second attempt fails'));
    });
    fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
    expect(screen.getByText('Something went wrong. ')).toBeTruthy();

    // The first attempt's response arrives late — it must not overwrite the second attempt's state.
    firstAttemptOptions?.onSuccess?.({ schema_version: 1, account: { id: 'stale' } });
    expect(screen.getByText('Something went wrong. ')).toBeTruthy();
    expect(screen.queryByText('Ready to download · coreo-export.json')).toBeNull();
  });
});

describe('profile: AccountActionsSection — Delete my data / Delete my account (issue #44)', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockDeleteDataMutate.mockClear();
    mockDeleteAccountMutate.mockClear();
    mockSignOut.mockClear();
  });

  afterEach(() => {
    alertSpy.mockRestore();
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
