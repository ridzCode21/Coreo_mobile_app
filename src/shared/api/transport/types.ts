export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TransportRequest = {
  method: HttpMethod;
  /** Full URL — what `liveTransport` actually fetches. */
  url: string;
  /** Path only (no origin/query), always set — what `mockTransport` matches routes against. */
  path: string;
  headers: Record<string, string>;
  /**
   * Request body: an already-serialized JSON string, a `FormData` for multipart uploads (e.g.
   * `POST /food/photo/`, API_REFERENCE.md §8), or undefined for bodyless requests. `mockTransport`
   * only introspects the string case; `liveTransport` passes it straight to `fetch`, which handles
   * both (and sets the multipart boundary itself when given a `FormData`).
   */
  body?: string | FormData;
};

export type TransportResponse = {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
};

/**
 * The swappable seam behind `shared/api/client.ts` — see docs/implementation-plan.md §2. Feature
 * code never touches this directly; it only ever calls `apiClient`.
 */
export type Transport = (request: TransportRequest) => Promise<TransportResponse>;
