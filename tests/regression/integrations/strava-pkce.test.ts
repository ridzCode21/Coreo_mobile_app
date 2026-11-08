/**
 * Issue #56 — the real `POST /integrations/strava/exchange/` requires a PKCE `code_verifier`
 * (`apps/integrations/serializers.py:12-19`, `StravaExchangeSerializer`): 43-128 characters, built
 * only from the unreserved RFC 3986 charset `A-Z a-z 0-9 - . _ ~`. `generateStravaCodeVerifier`
 * must produce a value the real serializer accepts every time.
 */
import {
  generateStravaCodeVerifier,
  generateStravaState,
} from '@/features/integrations/lib/strava/pkce';

const ALLOWED = /^[A-Za-z0-9\-._~]+$/;

describe('generateStravaCodeVerifier (issue #56, serializers.py:12-19)', () => {
  it('uses Web Crypto rather than Math.random for values sent through the OAuth flow', () => {
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');

    generateStravaCodeVerifier();
    generateStravaState();

    expect(getRandomValues).toHaveBeenCalledTimes(2);
    getRandomValues.mockRestore();
  });

  it('is within the backend-required 43-128 character length', () => {
    const verifier = generateStravaCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('only uses the unreserved PKCE charset the serializer validates', () => {
    const verifier = generateStravaCodeVerifier();
    expect(verifier).toMatch(ALLOWED);
  });

  it('is different on every call, like a real nonce', () => {
    const first = generateStravaCodeVerifier();
    const second = generateStravaCodeVerifier();
    expect(first).not.toBe(second);
  });
});
