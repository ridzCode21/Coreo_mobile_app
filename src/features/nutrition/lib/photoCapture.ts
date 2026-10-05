/**
 * The single place `expo-image-picker` is used, so the rest of the nutrition feature stays free of
 * that native dependency and typechecks even before it's installed. Run `npx expo install
 * expo-image-picker` to add it (CLAUDE.md §3 stack table + §6 new-dependency rule). Verify the API
 * against the SDK 57 docs before shipping (CLAUDE.md §2): the picker API surface shifts between SDKs
 * — this uses the array `mediaTypes` form current as of recent SDKs.
 */

import * as ImagePicker from 'expo-image-picker';

import type { PhotoUploadFile } from '@/features/nutrition/api/nutritionApi';

export type PhotoCaptureResult =
  | { status: 'ok'; file: PhotoUploadFile }
  | { status: 'cancelled' }
  | { status: 'permission_denied' };

function toUploadFile(asset: ImagePicker.ImagePickerAsset): PhotoUploadFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `meal-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/** Open the camera to photograph a meal (or the label). Returns a file ready for the photo upload. */
export async function captureMealPhotoFromCamera(): Promise<PhotoCaptureResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { status: 'permission_denied' };
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (result.canceled || !result.assets[0]) return { status: 'cancelled' };
  return { status: 'ok', file: toUploadFile(result.assets[0]) };
}

/** Pick an existing photo from the library (simulator-friendly fallback + label uploads). */
export async function pickMealPhotoFromLibrary(): Promise<PhotoCaptureResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'permission_denied' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return { status: 'cancelled' };
  return { status: 'ok', file: toUploadFile(result.assets[0]) };
}
