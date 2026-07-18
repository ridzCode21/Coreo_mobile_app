import Constants from 'expo-constants';

import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';
import { ApiError } from '@/shared/api/errors';
import { transport } from '@/shared/api/transport';
import type { HttpMethod } from '@/shared/api/transport/types';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? '';

type RequestOptions = {
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean; // attach the bearer token — default true
};

/**
 * The single HTTP client every feature's API module calls through — see docs/architecture.md §4.
 * No feature should construct its own fetch/axios instance. The actual request is dispatched by
 * `transport` (live network or in-app mock, picked by `EXPO_PUBLIC_API_MODE` — see
 * docs/implementation-plan.md §2); this function only builds the request and normalizes errors,
 * so feature code never knows which one it's talking to.
 */
async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, headers, body } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.authToken);
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Awaited<ReturnType<typeof transport>>;
  try {
    response = await transport({
      method,
      url: `${API_URL}${path}`,
      path,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw ApiError.network(cause);
  }

  const payload = await response.json();

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
