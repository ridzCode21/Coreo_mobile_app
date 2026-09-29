import Constants from 'expo-constants';

export type ApiMode = 'mock' | 'live';

export type ApiRuntimeConfig = {
  mode: ApiMode;
  baseUrl: string;
};

export const DEFAULT_LIVE_API_URL = 'https://vesselled-maxton-ringlike.ngrok-free.dev/api/v1';
export const DEFAULT_API_MODE: ApiMode = 'mock';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function readApiMode(value: unknown): ApiMode {
  return value === 'live' || value === 'mock' ? value : DEFAULT_API_MODE;
}

export function joinApiUrl(baseUrl: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getApiRuntimeConfig(): ApiRuntimeConfig {
  const extra = Constants.expoConfig?.extra;
  const rawBaseUrl = typeof extra?.apiUrl === 'string' ? extra.apiUrl : DEFAULT_LIVE_API_URL;

  return {
    mode: readApiMode(extra?.apiMode),
    baseUrl: normalizeBaseUrl(rawBaseUrl),
  };
}
