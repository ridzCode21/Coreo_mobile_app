/**
 * Issue #181 — the "Export my data" sheet (design `19f Export my data · working / done / failed`,
 * design html lines 3365-3401) has four states: working, done, failed, and offline (no dedicated `19f`
 * offline board exists; plan.md Decision 7 mirrors `19i Delete account`'s offline voice). Copy is
 * exact design text; the secondary button label depends on state (plan.md Decision 8): "Cancel" unless
 * there is a ready file to confirm ("Done").
 */

import { exportDataSheetCopy, EXPORT_FILE_NAME } from '@/features/profile/lib/exportDataSheetCopy';

describe('profile: export data sheet copy (issue #181)', () => {
  it('uses the literal design filename', () => {
    expect(EXPORT_FILE_NAME).toBe('coreo-export.json');
  });

  it('shows the working copy exactly as designed (19f working row)', () => {
    expect(exportDataSheetCopy({ kind: 'working' })).toEqual({
      title: 'Export my data',
      subtitle:
        'Everything Coreo knows: your meals, sessions, notes, and settings in one JSON file.',
      statusText: 'Putting your file together…',
      retryLabel: undefined,
      primaryLabel: 'Download',
      primaryEnabled: false,
      secondaryLabel: 'Cancel',
    });
  });

  it('shows the done copy exactly as designed (19f done row) with the literal filename', () => {
    expect(exportDataSheetCopy({ kind: 'done' })).toEqual({
      title: 'Export my data',
      subtitle:
        'Everything Coreo knows: your meals, sessions, notes, and settings in one JSON file.',
      statusText: `Ready to download · ${EXPORT_FILE_NAME}`,
      retryLabel: undefined,
      primaryLabel: 'Download',
      primaryEnabled: true,
      secondaryLabel: 'Done',
    });
  });

  it('shows the failed copy exactly as designed (19f failed row), including the retry label', () => {
    expect(exportDataSheetCopy({ kind: 'failed' })).toEqual({
      title: 'Export my data',
      subtitle:
        'Everything Coreo knows: your meals, sessions, notes, and settings in one JSON file.',
      statusText: 'Something went wrong. ',
      retryLabel: 'Try again',
      primaryLabel: 'Download',
      primaryEnabled: false,
      secondaryLabel: 'Cancel',
    });
  });

  it('shows the offline copy in the voice of the sibling 19i offline row', () => {
    expect(exportDataSheetCopy({ kind: 'offline' })).toEqual({
      title: 'Export my data',
      subtitle:
        'Everything Coreo knows: your meals, sessions, notes, and settings in one JSON file.',
      statusText:
        "You're offline. Exporting your data needs a connection. Try when you're back online.",
      retryLabel: undefined,
      primaryLabel: 'Download',
      primaryEnabled: false,
      secondaryLabel: 'Cancel',
    });
  });

  it('only the done state enables Download, and only the failed state offers a retry', () => {
    for (const kind of ['working', 'failed', 'offline'] as const) {
      expect(exportDataSheetCopy({ kind }).primaryEnabled).toBe(false);
    }
    expect(exportDataSheetCopy({ kind: 'done' }).primaryEnabled).toBe(true);

    for (const kind of ['working', 'done', 'offline'] as const) {
      expect(exportDataSheetCopy({ kind }).retryLabel).toBeUndefined();
    }
    expect(exportDataSheetCopy({ kind: 'failed' }).retryLabel).toBe('Try again');
  });
});
