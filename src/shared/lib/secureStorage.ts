import * as SecureStore from 'expo-secure-store';

/**
 * The only place auth tokens / sensitive small values are persisted — see docs/architecture.md
 * §2 and the security-review skill. Never read/write SecureStore directly from feature code;
 * go through this module so there's one seam to audit.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setJSON<T>(key: string, value: T): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  },
};

export const SECURE_STORAGE_KEYS = {
  authToken: 'coreo.auth.token',
  refreshToken: 'coreo.auth.refreshToken',
} as const;
