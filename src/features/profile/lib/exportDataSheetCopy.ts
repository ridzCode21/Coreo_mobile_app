export const EXPORT_FILE_NAME = 'coreo-export.json';

export type ExportDataSheetState =
  { kind: 'working' } | { kind: 'done' } | { kind: 'failed' } | { kind: 'offline' };

export type ExportDataSheetCopy = {
  title: string;
  subtitle: string;
  statusText: string;
  retryLabel: string | undefined;
  primaryLabel: string;
  primaryEnabled: boolean;
  secondaryLabel: string;
};

const commonCopy = {
  title: 'Export my data',
  subtitle: 'Everything Coreo knows: your meals, sessions, notes, and settings in one JSON file.',
  primaryLabel: 'Download',
} as const;

export function exportDataSheetCopy(state: ExportDataSheetState): ExportDataSheetCopy {
  switch (state.kind) {
    case 'working':
      return {
        ...commonCopy,
        statusText: 'Putting your file together…',
        retryLabel: undefined,
        primaryEnabled: false,
        secondaryLabel: 'Cancel',
      };
    case 'done':
      return {
        ...commonCopy,
        statusText: `Ready to download · ${EXPORT_FILE_NAME}`,
        retryLabel: undefined,
        primaryEnabled: true,
        secondaryLabel: 'Done',
      };
    case 'failed':
      return {
        ...commonCopy,
        statusText: 'Something went wrong. ',
        retryLabel: 'Try again',
        primaryEnabled: false,
        secondaryLabel: 'Cancel',
      };
    case 'offline':
      return {
        ...commonCopy,
        statusText:
          "You're offline. Exporting your data needs a connection. Try when you're back online.",
        retryLabel: undefined,
        primaryEnabled: false,
        secondaryLabel: 'Cancel',
      };
  }
}
