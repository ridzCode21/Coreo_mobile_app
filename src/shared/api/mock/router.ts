import type { HttpMethod } from '@/shared/api/transport/types';

export type MockRequest = {
  method: HttpMethod;
  path: string;
  /** Named params captured from a `:param` segment in the registered pattern. */
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: unknown;
};

export type MockResponse = {
  status: number;
  body?: unknown;
  /** Artificial latency so loading states are exercised for real — see implementation-plan.md §2. */
  delayMs?: number;
};

export type MockHandler = (request: MockRequest) => MockResponse | Promise<MockResponse>;

type Registration = {
  method: HttpMethod;
  regex: RegExp;
  paramNames: string[];
  handler: MockHandler;
};

const registrations: Registration[] = [];

function escapeRegExp(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return escapeRegExp(segment);
    })
    .join('/');
  return { regex: new RegExp(`^${source}/?$`), paramNames };
}

/**
 * Registry every feature's mock module calls into at import time — see
 * `features/<feature>/mocks/handlers.ts`. Pattern syntax: `/food/entries/:id/` — `:id` becomes
 * `request.params.id`.
 */
export function registerMock(method: HttpMethod, pattern: string, handler: MockHandler): void {
  const { regex, paramNames } = compile(pattern);
  registrations.push({ method, regex, paramNames, handler });
}

export function resolveMock(
  method: HttpMethod,
  path: string,
): { handler: MockHandler; params: Record<string, string> } | undefined {
  for (const registration of registrations) {
    if (registration.method !== method) continue;
    const match = registration.regex.exec(path);
    if (!match) continue;

    const params: Record<string, string> = {};
    registration.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });
    return { handler: registration.handler, params };
  }
  return undefined;
}

/** Test-only escape hatch — clears all registrations between test files. */
export function __resetMockRouterForTests(): void {
  registrations.length = 0;
}
