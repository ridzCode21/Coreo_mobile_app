/**
 * Issue #49 — the saved Home day and the queued meals sit on unencrypted storage, so signing out
 * must wipe both, in memory and on disk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useHomeCacheStore } from '@/features/home/store/homeCacheStore';
import { useMealQueueStore } from '@/features/nutrition/store/mealQueueStore';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { STORAGE_KEYS } from '@/shared/lib/storage';

jest.mock('@/shared/api/authTokenStore', () => ({
  secureAuthTokenStore: {
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn().mockResolvedValue(null),
    setTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('auth: sign out clears offline data (issue #49)', () => {
  it('removes the saved Home day and the queued meals from memory and disk', async () => {
    await useHomeCacheStore.getState().save('2026-07-07', new Date(2026, 6, 7, 14, 14));
    await useMealQueueStore.getState().enqueue([
      {
        id: 'a',
        createdAt: '2026-07-07T10:00:00.000Z',
        date: '2026-07-07',
        entry: {
          meal_type: 'lunch',
          food_name: 'Rice bowl',
          calories: 1,
          protein_g: 1,
          carbs_g: 1,
          fat_g: 1,
          source: 'manual',
        },
      },
    ]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.homeCache)).not.toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).not.toBeNull();

    await useSessionStore.getState().signOut();

    expect(useHomeCacheStore.getState().cache).toBeNull();
    expect(useMealQueueStore.getState().queue).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.homeCache)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toBeNull();
  });

  it('also removes the saved copies from disk by key, even if no store loaded them', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.homeCache, '{"anything":true}');
    await AsyncStorage.setItem(STORAGE_KEYS.mealQueue, '[{"anything":true}]');
    await useSessionStore.getState().signOut();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.homeCache)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toBeNull();
  });
});
