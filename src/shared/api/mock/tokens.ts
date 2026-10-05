/**
 * Mock access/refresh token issuance — "real-shaped" per implementation-plan.md §0/§2: a
 * three-segment, base64url `header.payload.signature` string carrying the same claims
 * (`user_id`, `email`, `token_type`, `iat`, `exp`, `jti`) API_REFERENCE.md §1 documents for the
 * real JWT, verified structurally (expiry + blacklist) rather than cryptographically — there's no
 * real secret to check against because there's no real backend yet.
 */

const ACCESS_TTL_SECONDS = 60 * 60; // 60 minutes, matches API_REFERENCE.md §1
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type MockTokenType = 'access' | 'refresh';

export type MockTokenPayload = {
  user_id: string;
  email: string;
  token_type: MockTokenType;
  iat: number;
  exp: number;
  jti: string;
};

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlEncode(input: string): string {
  let result = '';
  let i = 0;
  for (; i + 3 <= input.length; i += 3) {
    const n =
      (input.charCodeAt(i) << 16) | (input.charCodeAt(i + 1) << 8) | input.charCodeAt(i + 2);
    result +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      BASE64_CHARS[(n >> 6) & 63] +
      BASE64_CHARS[n & 63];
  }
  const remaining = input.length - i;
  if (remaining === 1) {
    const n = input.charCodeAt(i) << 16;
    result += BASE64_CHARS[(n >> 18) & 63] + BASE64_CHARS[(n >> 12) & 63];
  } else if (remaining === 2) {
    const n = (input.charCodeAt(i) << 16) | (input.charCodeAt(i + 1) << 8);
    result +=
      BASE64_CHARS[(n >> 18) & 63] + BASE64_CHARS[(n >> 12) & 63] + BASE64_CHARS[(n >> 6) & 63];
  }
  return result.replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const lookup = (char: string) => BASE64_CHARS.indexOf(char);
  let result = '';
  let i = 0;
  for (; i + 4 <= normalized.length; i += 4) {
    const n =
      (lookup(normalized[i]) << 18) |
      (lookup(normalized[i + 1]) << 12) |
      (lookup(normalized[i + 2]) << 6) |
      lookup(normalized[i + 3]);
    result += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  const remaining = normalized.length - i;
  if (remaining === 2) {
    const n = (lookup(normalized[i]) << 18) | (lookup(normalized[i + 1]) << 12);
    result += String.fromCharCode((n >> 16) & 255);
  } else if (remaining === 3) {
    const n =
      (lookup(normalized[i]) << 18) |
      (lookup(normalized[i + 1]) << 12) |
      (lookup(normalized[i + 2]) << 6);
    result += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255);
  }
  return result;
}

function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function sign(
  user: { id: string; email: string },
  tokenType: MockTokenType,
  ttlSeconds: number,
): { token: string; payload: MockTokenPayload } {
  const iat = Math.floor(Date.now() / 1000);
  const payload: MockTokenPayload = {
    user_id: user.id,
    email: user.email,
    token_type: tokenType,
    iat,
    exp: iat + ttlSeconds,
    jti: randomId(),
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'mock-HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(`mock-signature-${payload.jti}`);
  return { token: `${header}.${body}.${signature}`, payload };
}

const blacklist = new Set<string>();

export function issueTokenPair(user: { id: string; email: string }): {
  access: string;
  refresh: string;
} {
  return {
    access: sign(user, 'access', ACCESS_TTL_SECONDS).token,
    refresh: sign(user, 'refresh', REFRESH_TTL_SECONDS).token,
  };
}

export function decodeMockToken(token: string): MockTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as MockTokenPayload;
  } catch {
    return null;
  }
}

/** Checks shape, expiry, and blacklist — the mock's equivalent of real JWT verification. */
export function verifyMockToken(
  token: string,
  expectedType: MockTokenType = 'access',
): MockTokenPayload | null {
  const payload = decodeMockToken(token);
  if (!payload) return null;
  if (payload.token_type !== expectedType) return null;
  if (blacklist.has(payload.jti)) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/** Called on logout — matches the real API's "blacklist the jti" behavior (API_REFERENCE §1). */
export function blacklistMockToken(token: string): void {
  const payload = decodeMockToken(token);
  if (payload) blacklist.add(payload.jti);
}

export function __resetMockTokensForTests(): void {
  blacklist.clear();
}
