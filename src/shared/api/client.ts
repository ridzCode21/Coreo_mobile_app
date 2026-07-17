import Constants from 'expo-constants';

import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';
import { ApiError } from '@/shared/api/errors';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? '';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean; // attach the bearer token — default true
};

/**
 * The single HTTP client every feature's API module calls through — see docs/architecture.md §4.
 * No feature should construct its own fetch/axios instance. There's no real backend yet
 * (product-context.md is mock-API-first for MVP); this exists so feature code is written
 * against a stable seam from day one instead of scattering ad-hoc fetch calls that all need
 * rewriting later.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.authToken);
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw ApiError.network(cause);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
