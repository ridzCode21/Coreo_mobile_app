import { resolveMock } from '@/shared/api/mock/router';
import type { Transport, TransportResponse } from '@/shared/api/transport/types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function notFound(): TransportResponse {
  return {
    status: 404,
    ok: false,
    json: async () => ({ error: 'mock_route_not_found' }),
  };
}

/**
 * Routes a request through the in-app mock router instead of the network — see
 * docs/implementation-plan.md §2. Feature code is unaware this is happening; it only ever talks
 * to `shared/api/client.ts`.
 */
export const mockTransport: Transport = async (request) => {
  const [pathOnly, queryString] = request.path.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString ?? ''));
  const match = resolveMock(request.method, pathOnly);

  if (!match) return notFound();

  let body: unknown;
  if (request.body) {
    try {
      body = JSON.parse(request.body);
    } catch {
      body = undefined;
    }
  }

  const result = await match.handler({
    method: request.method,
    path: pathOnly,
    params: match.params,
    query,
    headers: request.headers,
    body,
  });

  if (result.delayMs) await sleep(result.delayMs);

  return {
    status: result.status,
    ok: result.status >= 200 && result.status < 300,
    json: async () => result.body,
  };
};
