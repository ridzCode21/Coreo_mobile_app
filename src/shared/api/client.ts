import { joinApiUrl, type ApiRuntimeConfig } from '@/shared/api/config';
import { ApiError } from '@/shared/api/errors';
import { apiRuntimeConfig, transport } from '@/shared/api/transport';
import type { Transport, HttpMethod } from '@/shared/api/transport/types';
import { secureAuthTokenStore, type AuthTokenStore } from '@/shared/api/authTokenStore';

type RequestOptions = {
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean; // attach the bearer token — default true
  /**
   * Multipart upload (e.g. `POST /food/photo/`, API_REFERENCE.md §8). When true, `body` must be a
   * `FormData`, it is passed to the transport untouched (not JSON-stringified), and the JSON
   * `Content-Type` is omitted so `fetch` sets the multipart boundary itself.
   */
  multipart?: boolean;
};

type ApiClientDependencies = {
  config: ApiRuntimeConfig;
  transport: Transport;
  tokenStore: AuthTokenStore;
};

type ApiClient = {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  delete: <T>(path: string, options?: RequestOptions) => Promise<T>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function accessFromRefreshPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const data = payload.data;
  if (!isRecord(data)) return null;
  return typeof data.access === 'string' ? data.access : null;
}

/**
 * The single HTTP client every feature's API module calls through — see docs/architecture.md §4.
 * No feature should construct its own fetch/axios instance. The actual request is dispatched by
 * `transport` (live network or in-app mock, picked by `EXPO_PUBLIC_API_MODE` — see
 * docs/implementation-plan.md §2); this function only builds the request and normalizes errors,
 * so feature code never knows which one it's talking to.
 */
export function createApiClient({
  config,
  transport: requestTransport,
  tokenStore,
}: ApiClientDependencies): ApiClient {
  async function refreshAccessToken(): Promise<boolean> {
    const refresh = await tokenStore.getRefreshToken();
    if (!refresh) return false;

    const response = await requestTransport({
      method: 'POST',
      url: joinApiUrl(config.baseUrl, '/users/token/refresh/'),
      path: '/users/token/refresh/',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      await tokenStore.clearTokens();
      return false;
    }

    const payload = await response.json();
    const access = accessFromRefreshPayload(payload);
    if (!access) {
      await tokenStore.clearTokens();
      return false;
    }

    await tokenStore.setAccessToken(access);
    return true;
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
    retryOnUnauthorized = true,
  ): Promise<T> {
    const { auth = true, headers, body, multipart = false } = options;

    const finalHeaders: Record<string, string> = {
      // Let fetch set `multipart/form-data; boundary=...` itself when uploading a FormData.
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    };

    if (auth) {
      const token = await tokenStore.getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    let requestBody: string | FormData | undefined;
    if (body !== undefined) {
      requestBody = multipart ? (body as FormData) : JSON.stringify(body);
    }

    let response: Awaited<ReturnType<typeof requestTransport>>;
    try {
      response = await requestTransport({
        method,
        url: joinApiUrl(config.baseUrl, path),
        path,
        headers: finalHeaders,
        body: requestBody,
      });
    } catch (cause) {
      throw ApiError.network(cause);
    }

    const payload = await response.json();

    if (!response.ok) {
      if (auth && response.status === 401 && retryOnUnauthorized) {
        try {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return request<T>(method, path, options, false);
          }
        } catch {
          await tokenStore.clearTokens();
        }
      }
      throw ApiError.fromResponse(response.status, payload);
    }

    return payload as T;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('PUT', path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('PATCH', path, { ...options, body }),
    delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  };
}

export const apiClient = createApiClient({
  config: apiRuntimeConfig,
  transport,
  tokenStore: secureAuthTokenStore,
});
