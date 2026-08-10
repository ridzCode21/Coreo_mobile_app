import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';

export type AuthTokenStore = {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setAccessToken: (access: string) => Promise<void>;
  setTokens: (tokens: { access: string; refresh: string }) => Promise<void>;
  clearTokens: () => Promise<void>;
};

export const secureAuthTokenStore: AuthTokenStore = {
  getAccessToken: () => secureStorage.getItem(SECURE_STORAGE_KEYS.authToken),
  getRefreshToken: () => secureStorage.getItem(SECURE_STORAGE_KEYS.refreshToken),
  setAccessToken: (access) => secureStorage.setItem(SECURE_STORAGE_KEYS.authToken, access),
  async setTokens({ access, refresh }) {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.authToken, access);
    await secureStorage.setItem(SECURE_STORAGE_KEYS.refreshToken, refresh);
  },
  async clearTokens() {
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.authToken);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.refreshToken);
  },
};
