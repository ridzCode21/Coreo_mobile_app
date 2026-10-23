/**
 * Issue #47 — registering this phone and deleting it on sign out, through the mock API. Only the
 * row id is kept (in SecureStore); the push token is never stored by the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import '@/shared/api/mock/registerAllMocks';
import { secureAuthTokenStore } from '@/shared/api/authTokenStore';
import { mockDb, __resetMockDbForTests } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';
import { runBeforeSessionEnd } from '@/shared/lib/sessionCleanup';
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from '@/features/notifications/api/deviceTokenApi';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import '@/features/notifications/lib/registerNotifications';

async function signIn() {
  const user = {
    id: 'u1',
    email: 'maya@example.com',
    password: 'unused',
    first_name: 'Maya',
    last_name: 'Chen',
    phone: null,
    date_of_birth: null,
    gender: null,
    timezone: 'UTC',
    is_premium: false,
    email_verified: true,
    phone_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  mockDb.users.push(user);
  await secureAuthTokenStore.setTokens(issueTokenPair(user));
}

describe('device token registration', () => {
  beforeEach(async () => {
    __resetMockDbForTests();
    await AsyncStorage.clear();
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.deviceTokenId);
  });

  it('registers the phone and keeps only the row id in SecureStore', async () => {
    await signIn();
    const id = await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    expect(mockDb.deviceTokens).toHaveLength(1);
    expect(await secureStorage.getItem(SECURE_STORAGE_KEYS.deviceTokenId)).toBe(id);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('registering again keeps one row', async () => {
    await signIn();
    const first = await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    const second = await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    expect(second).toBe(first);
    expect(mockDb.deviceTokens).toHaveLength(1);
  });

  it('rejects a token longer than the server allows before sending it', async () => {
    await signIn();
    await expect(
      registerDeviceToken({ token: 'x'.repeat(513), platform: 'ios' }),
    ).rejects.toBeDefined();
    expect(mockDb.deviceTokens).toHaveLength(0);
  });

  it('unregister deletes the row and forgets the id; nothing saved means nothing to do', async () => {
    await signIn();
    await expect(unregisterDeviceToken()).resolves.toBeUndefined();
    await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'android' });
    await unregisterDeviceToken();
    expect(mockDb.deviceTokens).toHaveLength(0);
    expect(await secureStorage.getItem(SECURE_STORAGE_KEYS.deviceTokenId)).toBeNull();
  });

  it('an already deleted row (404) is treated as done', async () => {
    await signIn();
    await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    mockDb.deviceTokens = [];
    await expect(unregisterDeviceToken()).resolves.toBeUndefined();
    expect(await secureStorage.getItem(SECURE_STORAGE_KEYS.deviceTokenId)).toBeNull();
  });

  it('sign out runs the unregister step while the session still exists', async () => {
    await signIn();
    await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    await runBeforeSessionEnd();
    expect(mockDb.deviceTokens).toHaveLength(0);
  });

  it('signing out deletes the registration with the session still valid, then clears tokens', async () => {
    await signIn();
    await registerDeviceToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });
    await useSessionStore.getState().signOut();
    expect(mockDb.deviceTokens).toHaveLength(0);
    expect(await secureAuthTokenStore.getAccessToken()).toBeNull();
    expect(await secureStorage.getItem(SECURE_STORAGE_KEYS.deviceTokenId)).toBeNull();
  });
});
