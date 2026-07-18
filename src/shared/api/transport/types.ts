export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TransportRequest = {
  method: HttpMethod;
  /** Full URL — what `liveTransport` actually fetches. */
  url: string;
  /** Path only (no origin/query), always set — what `mockTransport` matches routes against. */
  path: string;
  headers: Record<string, string>;
  /** Already-serialized JSON string, or undefined for bodyless requests. */
  body?: string;
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
