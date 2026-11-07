import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';

import { EXPORT_FILE_NAME } from '@/features/profile/lib/exportDataSheetCopy';

const exportFileBaseName = EXPORT_FILE_NAME.replace(/\.json$/, '');
const exportMimeType = 'application/json';

export async function writeExportFile(data: unknown): Promise<File> {
  const file = new File(Paths.cache, EXPORT_FILE_NAME);
  if (file.exists) file.delete();
  file.write(JSON.stringify(data, null, 2));
  return file;
}

export async function downloadExportFile(file: File): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: file.uri });
    return;
  }

  if (Platform.OS !== 'android') return;

  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return;

  const destination = await StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    exportFileBaseName,
    exportMimeType,
  );
  await StorageAccessFramework.writeAsStringAsync(destination, await file.text());
}
