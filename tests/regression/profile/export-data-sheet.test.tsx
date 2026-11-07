/**
 * Issue #181 — `ExportDataSheet` wires `exportDataSheetCopy` to real controls (design `19f`, design
 * html lines 3365-3401). It is purely presentational (state in, callbacks out), the same split as
 * `SignOutSheet`/`signOutSheetCopy`. A disabled "Download" must never fire `onDownload` — React
 * Native's `Pressable` already guarantees this when `disabled` is wired through, but it is exactly the
 * accidental regression a future refactor could reintroduce, so it is asserted directly.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Circle } from 'react-native-svg';

import { ExportDataSheet } from '@/features/profile/components/ExportDataSheet';
import type { ExportDataSheetState } from '@/features/profile/lib/exportDataSheetCopy';

function renderSheet(state: ExportDataSheetState) {
  const onClose = jest.fn();
  const onRetry = jest.fn();
  const onDownload = jest.fn();
  render(
    <ExportDataSheet
      visible
      state={state}
      onClose={onClose}
      onRetry={onRetry}
      onDownload={onDownload}
    />,
  );
  return { onClose, onRetry, onDownload };
}

describe('profile: ExportDataSheet (issue #181)', () => {
  it('shows the working row with Download disabled and a "Cancel" secondary button', () => {
    const { onDownload } = renderSheet({ kind: 'working' });

    expect(screen.getByText('Export my data')).toBeTruthy();
    expect(screen.getByText('Putting your file together…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toHaveProp('accessibilityState', {
      disabled: true,
    });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Download' }));
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('shows the done row with Download enabled and a "Done" secondary button', () => {
    const { onDownload } = renderSheet({ kind: 'done' });

    expect(screen.getByText('Ready to download · coreo-export.json')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toHaveProp('accessibilityState', {
      disabled: false,
    });
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Download' }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('uses the design’s bare checkmark for done and alert-circle badge for failed', () => {
    renderSheet({ kind: 'done' });

    expect(screen.UNSAFE_queryAllByType(Circle)).toHaveLength(0);

    screen.unmount();
    renderSheet({ kind: 'failed' });

    expect(screen.UNSAFE_getAllByType(Circle)).toHaveLength(1);
  });

  it('uses the design-specified working and failed row tints', () => {
    renderSheet({ kind: 'working' });

    const workingRow = screen.getByText('Putting your file together…').parent?.parent;
    expect(StyleSheet.flatten(workingRow?.props.style)).toMatchObject({
      backgroundColor: 'rgba(255,255,255,0.4)',
      borderColor: 'rgba(255,255,255,0.5)',
    });

    screen.unmount();
    renderSheet({ kind: 'failed' });

    const failedRow = screen.getByText('Something went wrong. ').parent?.parent;
    expect(StyleSheet.flatten(failedRow?.props.style)).toMatchObject({
      backgroundColor: 'rgba(122,82,32,0.08)',
      borderColor: 'rgba(122,82,32,0.2)',
    });
  });

  it('shows the failed row with an inline "Try again" that retries, and Download disabled', () => {
    const { onRetry, onDownload } = renderSheet({ kind: 'failed' });

    expect(screen.getByText('Something went wrong. ')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toHaveProp('accessibilityState', {
      disabled: true,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Download' }));
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('shows the offline row with Download disabled and no retry control', () => {
    renderSheet({ kind: 'offline' });

    expect(
      screen.getByText(
        "You're offline. Exporting your data needs a connection. Try when you're back online.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toHaveProp('accessibilityState', {
      disabled: true,
    });
    expect(screen.queryByText('Try again')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('the secondary button always closes the sheet, in every state', () => {
    for (const kind of ['working', 'done', 'failed', 'offline'] as const) {
      const { onClose } = renderSheet({ kind });
      const secondaryLabel = kind === 'done' ? 'Done' : 'Cancel';
      fireEvent.press(screen.getByRole('button', { name: secondaryLabel }));
      expect(onClose).toHaveBeenCalledTimes(1);
      screen.unmount();
    }
  });
});
