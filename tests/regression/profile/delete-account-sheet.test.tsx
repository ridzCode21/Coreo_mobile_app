/**
 * Issue #183 — `DeleteAccountSheet` is the presentational sheet for design boards `19h Delete
 * account · warning` (html lines 3440-3463) and `19i Delete account · confirm email` /
 * `19i … sending / failed / offline / deleted` (html lines 3469-3534). Same split as
 * `ExportDataSheet`/`exportDataSheetCopy`: step + data in, callbacks out, no API calls here.
 *
 * The design's "Further states" block (line 3497) stacks all four post-confirm states into one
 * compact documentation mockup — it is not four separate rendered sheets. Following the existing
 * `ExportDataSheet` precedent (one sheet frame, one constant title, a state-driven status row),
 * deleting/failed/offline/deleted all render in the same full-size sheet frame used for
 * warning/confirmEmail, titled "Delete my account" (plan.md Decision — see plan.md Decision log).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteAccountSheet } from '@/features/profile/components/DeleteAccountSheet';
import type { DeleteAccountStep } from '@/features/profile/lib/deleteAccountCopy';
import { colors, withAlpha } from '@/shared/theme/tokens';

const ACCOUNT_EMAIL = 'priya@example.com';

function renderSheet(step: DeleteAccountStep, typedEmail = '') {
  const callbacks = {
    onChangeTypedEmail: jest.fn(),
    onContinue: jest.fn(),
    onOpenExport: jest.fn(),
    onCancel: jest.fn(),
    onConfirmDelete: jest.fn(),
    onRetry: jest.fn(),
    onBack: jest.fn(),
    onStartOver: jest.fn(),
  };
  render(
    <DeleteAccountSheet
      visible
      step={step}
      accountEmail={ACCOUNT_EMAIL}
      typedEmail={typedEmail}
      {...callbacks}
    />,
  );
  return callbacks;
}

describe('profile: DeleteAccountSheet — warning (design 19h, issue #183)', () => {
  it('shows the exact warning copy, what-goes bullets and the export note', () => {
    renderSheet({ kind: 'warning' });

    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(
      screen.getByText(
        "This closes everything — your account, your history, all of it. It can't be undone.",
      ),
    ).toBeTruthy();
    expect(screen.getByText('Your account and sign-in details')).toBeTruthy();
    expect(screen.getByText('All meals, sessions, and notes')).toBeTruthy();
    expect(screen.getByText('Everything Coreo learned about you')).toBeTruthy();
  });

  it('uses the design-specified soft attention note and bullet marker treatments', () => {
    renderSheet({ kind: 'warning' });

    screen.getAllByText('—').forEach((marker) => {
      expect(marker).toHaveStyle({ color: withAlpha(colors.attention, 0.7) });
    });
    expect(screen.getByText('Before you go — ').parent?.parent).toHaveStyle({
      backgroundColor: withAlpha(colors.attention, 0.08),
      borderColor: withAlpha(colors.attention, 0.18),
    });
  });

  it('"Continue" and "Cancel" call their callbacks', () => {
    const { onContinue, onCancel } = renderSheet({ kind: 'warning' });

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('the "export your data" link calls onOpenExport, not onContinue', () => {
    const { onOpenExport, onContinue } = renderSheet({ kind: 'warning' });

    fireEvent.press(screen.getByRole('button', { name: 'export your data' }));
    expect(onOpenExport).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});

describe('profile: DeleteAccountSheet — confirm email (design 19i, issue #183)', () => {
  it('shows the exact confirm-email copy and the email field with the account email as placeholder', () => {
    renderSheet({ kind: 'confirmEmail' });

    expect(screen.getByText('Type your email to confirm')).toBeTruthy();
    expect(
      screen.getByText('Type the email on this account. We want to be sure this is you.'),
    ).toBeTruthy();
    expect(screen.getByPlaceholderText(ACCOUNT_EMAIL)).toBeTruthy();
  });

  it('typing calls onChangeTypedEmail with the raw value', () => {
    const { onChangeTypedEmail } = renderSheet({ kind: 'confirmEmail' });

    fireEvent.changeText(screen.getByLabelText('Email'), 'wrong@example.com');
    expect(onChangeTypedEmail).toHaveBeenCalledWith('wrong@example.com');
  });

  it('"Delete my account" is disabled until the typed email matches', () => {
    renderSheet({ kind: 'confirmEmail' }, 'not-matching@example.com');
    expect(screen.getByRole('button', { name: 'Delete my account' })).toHaveProp(
      'accessibilityState',
      { disabled: true },
    );

    screen.unmount();
    renderSheet({ kind: 'confirmEmail' }, ACCOUNT_EMAIL);
    expect(screen.getByRole('button', { name: 'Delete my account' })).toHaveProp(
      'accessibilityState',
      { disabled: false },
    );
  });

  it('matches case-insensitively and trimmed, same as the pure matcher', () => {
    renderSheet({ kind: 'confirmEmail' }, `  ${ACCOUNT_EMAIL.toUpperCase()}  `);
    expect(screen.getByRole('button', { name: 'Delete my account' })).toHaveProp(
      'accessibilityState',
      { disabled: false },
    );
  });

  it('pressing "Delete my account" only fires onConfirmDelete when enabled', () => {
    const disabled = renderSheet({ kind: 'confirmEmail' }, 'nope');
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(disabled.onConfirmDelete).not.toHaveBeenCalled();

    screen.unmount();
    const enabled = renderSheet({ kind: 'confirmEmail' }, ACCOUNT_EMAIL);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(enabled.onConfirmDelete).toHaveBeenCalledTimes(1);
  });

  it('"Cancel" calls onCancel', () => {
    const { onCancel } = renderSheet({ kind: 'confirmEmail' });
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('profile: DeleteAccountSheet — deleting/failed/offline/deleted (design 19i states, issue #183)', () => {
  it('uses the same neutral status treatment for every further state', () => {
    renderSheet({ kind: 'deleting' });
    expect(screen.getByText('Closing your account…').parent?.parent).toHaveStyle({
      backgroundColor: withAlpha(colors.white, 0.4),
      borderColor: withAlpha(colors.white, 0.5),
    });

    screen.unmount();
    renderSheet({ kind: 'offline' });
    expect(
      screen.getByText(
        "You're offline. Account deletion needs a connection. Try when you're back online.",
      ).parent?.parent,
    ).toHaveStyle({
      backgroundColor: withAlpha(colors.white, 0.4),
      borderColor: withAlpha(colors.white, 0.5),
    });

    screen.unmount();
    renderSheet({ kind: 'failed' });
    expect(
      screen.getByText('Something went wrong. Your account is still open.').parent?.parent,
    ).toHaveStyle({
      backgroundColor: withAlpha(colors.white, 0.4),
      borderColor: withAlpha(colors.white, 0.5),
    });

    screen.unmount();
    renderSheet({ kind: 'deleted' });
    expect(
      screen.getByText('Your account is gone. Start fresh any time.').parent?.parent,
    ).toHaveStyle({
      backgroundColor: withAlpha(colors.white, 0.4),
      borderColor: withAlpha(colors.white, 0.5),
    });
  });

  it('deleting shows "Closing your account…" and no action buttons', () => {
    renderSheet({ kind: 'deleting' });
    expect(screen.getByText('Closing your account…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('failed shows the exact copy and Retry/Back, each calling its own callback', () => {
    const { onRetry, onBack } = renderSheet({ kind: 'failed' });

    expect(screen.getByText('Something went wrong. Your account is still open.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offline shows the exact copy and only a Back button', () => {
    const { onBack } = renderSheet({ kind: 'offline' });

    expect(
      screen.getByText(
        "You're offline. Account deletion needs a connection. Try when you're back online.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('deleted shows the exact copy and a "Start over" button, never mentions a confirmation email', () => {
    const { onStartOver } = renderSheet({ kind: 'deleted' });

    expect(screen.getByText('Your account is gone. Start fresh any time.')).toBeTruthy();
    expect(screen.queryByText(/confirmation email/i)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Start over' }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
