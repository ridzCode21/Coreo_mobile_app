import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * The only place auth tokens / sensitive small values are persisted — see docs/architecture.md
 * §2 and the security-review skill. Never read/write SecureStore directly from feature code; go
 * through this module so there's one seam to audit.
 *
 * Web has no real fallback here: this app's target platforms are iOS and Android only
 * (product-context.md §8), and `expo-secure-store`'s web shim doesn't implement the full native
 * API in this SDK (throws `getValueWithKeyAsync is not a function` instead of degrading). Rather
 * than let that crash `expo start --web` (used for quick dev iteration / bundling smoke tests,
 * not a shipped target), fall back to a plain in-memory `Map` on web — it satisfies this
 * module's contract for the current tab session but intentionally does **not** persist across
 * reloads. Deliberately not `localStorage`: that would be a real security regression (persistent,
 * XSS-exposed), not just a missing feature — an in-memory fallback that disappears on refresh is
 * the closer approximation of "no secure storage available here."
 */
const isWeb = Platform.OS === 'web';
const webMemoryStore = new Map<string, string>();

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webMemoryStore.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webMemoryStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    webMemoryStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  getItem,
  setItem,
  deleteItem,
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setJSON<T>(key: string, value: T): Promise<void> {
    await setItem(key, JSON.stringify(value));
  },
};

export const SECURE_STORAGE_KEYS = {
  authToken: 'coreo.auth.token',
  refreshToken: 'coreo.auth.refreshToken',
} as const;
