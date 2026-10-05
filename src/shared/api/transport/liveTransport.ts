import type { Transport } from '@/shared/api/transport/types';

/** The real network path — today's `fetch`, unchanged in behavior from before the mock layer. */
export const liveTransport: Transport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return {
    status: response.status,
    ok: response.ok,
    json: () => response.json().catch(() => undefined),
  };
};
