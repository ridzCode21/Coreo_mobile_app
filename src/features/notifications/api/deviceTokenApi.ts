import { MutationObserver, useMutation, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';

// `POST /users/me/device-tokens/` (API_REFERENCE §5): the app is Expo, so `token` is the
// `expo-notifications` push token and `platform` is `ios`, `android`, or `web`.
export const devicePlatformSchema = z.enum(['ios', 'android', 'web']);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

export const registerDeviceTokenBodySchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: devicePlatformSchema,
});
export type RegisterDeviceTokenBody = z.infer<typeof registerDeviceTokenBodySchema>;

const deviceTokenRowSchema = z.object({
  id: z.string(),
  platform: devicePlatformSchema,
  token: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Registers this phone for the nudge and keeps only the row id, in SecureStore, so sign-out can
 * delete the row. The push token itself is never stored or logged here: the server already holds
 * it, and a push token is enough to send pushes to this phone.
 */
export async function registerDeviceToken(body: RegisterDeviceTokenBody): Promise<string> {
  const row = deviceTokenRowSchema.parse(
    await apiClient.post<unknown>(
      '/users/me/device-tokens/',
      registerDeviceTokenBodySchema.parse(body),
    ),
  );
  await secureStorage.setItem(SECURE_STORAGE_KEYS.deviceTokenId, row.id);
  return row.id;
}

/**
 * `DELETE /users/me/device-tokens/{token_id}/`: the server removes the row (and its notices), so
 * this phone gets nothing further for the signed-in account. An unknown id (404) means it is
 * already gone. The saved id is forgotten either way.
 */
export async function unregisterDeviceToken(): Promise<void> {
  const id = await secureStorage.getItem(SECURE_STORAGE_KEYS.deviceTokenId);
  if (!id) return;
  try {
    await apiClient.delete<void>(`/users/me/device-tokens/${encodeURIComponent(id)}/`);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  } finally {
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.deviceTokenId);
  }
}

export const registerDeviceTokenMutationOptions = {
  mutationKey: ['deviceToken', 'register'] as const,
  mutationFn: registerDeviceToken,
};

export const unregisterDeviceTokenMutationOptions = {
  mutationKey: ['deviceToken', 'unregister'] as const,
  mutationFn: unregisterDeviceToken,
};

export function useRegisterDeviceTokenMutation() {
  return useMutation(registerDeviceTokenMutationOptions);
}

/** For code that runs outside React (sign-out): the same mutation, run through the query client. */
export function unregisterDeviceTokenWith(queryClient: QueryClient): Promise<void> {
  return new MutationObserver(queryClient, unregisterDeviceTokenMutationOptions).mutate();
}
