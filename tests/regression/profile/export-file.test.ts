/**
 * Issue #181 — `writeExportFile`/`downloadExportFile` produce a real `coreo-export.json` file and hand
 * it to the OS (plan.md Decision 2). `expo-file-system`'s class API (`File`/`Paths`) is backed by
 * `jest-expo`'s built-in in-memory mock, so this test exercises the real read/write code path. RN's
 * `Share` module on Android only ever sends `text/plain` (checked against
 * `node_modules/react-native/ReactAndroid/.../ShareModule.kt`) — it cannot attach a file — so Android
 * uses `expo-file-system/legacy`'s `StorageAccessFramework` (Android's native "Save As" picker)
 * instead, which has no `jest-expo` mock and is stubbed here.
 */

import { Platform, Share } from 'react-native';

import { downloadExportFile, writeExportFile } from '@/features/profile/lib/exportFile';

const mockRequestDirectoryPermissionsAsync = jest.fn();
const mockCreateFileAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: (...args: unknown[]) =>
      mockRequestDirectoryPermissionsAsync(...args),
    createFileAsync: (...args: unknown[]) => mockCreateFileAsync(...args),
    writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  },
}));

describe('profile: exportFile (issue #181)', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mockRequestDirectoryPermissionsAsync.mockReset();
    mockCreateFileAsync.mockReset();
    mockWriteAsStringAsync.mockReset();
  });

  afterEach(() => {
    shareSpy.mockRestore();
  });

  it('writes a real coreo-export.json file with pretty-printed JSON content', async () => {
    const file = await writeExportFile({ schema_version: 1, account: { id: 'u1' } });

    expect(file.uri).toContain('coreo-export.json');
    expect(file.exists).toBe(true);
    expect(await file.text()).toBe(
      JSON.stringify({ schema_version: 1, account: { id: 'u1' } }, null, 2),
    );
  });

  it('overwrites a previous export rather than failing because the file already exists', async () => {
    await writeExportFile({ schema_version: 1, account: { id: 'u1' } });
    const second = await writeExportFile({ schema_version: 1, account: { id: 'u2' } });

    expect(await second.text()).toContain('u2');
  });

  it('on iOS, hands the real file to the native Share sheet', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios' });
    const file = await writeExportFile({ schema_version: 1, account: { id: 'u1' } });

    await downloadExportFile(file);

    expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({ url: file.uri }));
    expect(mockRequestDirectoryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('on Android, saves the real file through the Storage Access Framework picker', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
    mockRequestDirectoryPermissionsAsync.mockResolvedValue({
      granted: true,
      directoryUri: 'content://tree/mock-dir',
    });
    mockCreateFileAsync.mockResolvedValue('content://tree/mock-dir/coreo-export.json');
    const file = await writeExportFile({ schema_version: 1, account: { id: 'u1' } });

    await downloadExportFile(file);

    expect(mockRequestDirectoryPermissionsAsync).toHaveBeenCalledTimes(1);
    // The SAF file name is passed without an extension (`build/legacy/FileSystem.d.ts`): the mime
    // type supplies it, so passing "coreo-export.json" here would create "coreo-export.json.json".
    expect(mockCreateFileAsync).toHaveBeenCalledWith(
      'content://tree/mock-dir',
      'coreo-export',
      'application/json',
    );
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      'content://tree/mock-dir/coreo-export.json',
      await file.text(),
    );
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('on Android, declining the folder picker does not throw or write anything', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
    mockRequestDirectoryPermissionsAsync.mockResolvedValue({ granted: false });
    const file = await writeExportFile({ schema_version: 1, account: { id: 'u1' } });

    await expect(downloadExportFile(file)).resolves.toBeUndefined();

    expect(mockCreateFileAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });
});
