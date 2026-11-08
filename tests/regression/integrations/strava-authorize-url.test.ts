/**
 * Issue #56 — builds the URL the app opens in the system browser to start Strava's OAuth consent.
 * Strava's own OAuth docs never mention PKCE (plan.md Decision log), so `code_challenge` is
 * deliberately NOT sent here — only the backend exchange call carries `code_verifier`
 * (`apps/integrations/serializers.py:12-19`). `state` guards against a stray/forged redirect being
 * accepted (app-security-review).
 */
import { buildStravaAuthorizeUrl } from '@/features/integrations/lib/strava/authorizeUrl';

describe('buildStravaAuthorizeUrl (issue #56)', () => {
  it('points at Strava’s real OAuth authorize endpoint', () => {
    const url = new URL(
      buildStravaAuthorizeUrl({
        clientId: '12345',
        redirectUri: 'coreo://strava-connect',
        state: 'abc123',
      }),
    );
    expect(url.origin).toBe('https://www.strava.com');
    expect(url.pathname).toBe('/oauth/authorize');
  });

  it('includes client_id, redirect_uri, response_type=code, scope and state — never a code_challenge', () => {
    const url = new URL(
      buildStravaAuthorizeUrl({
        clientId: '12345',
        redirectUri: 'coreo://strava-connect',
        state: 'abc123',
      }),
    );
    expect(url.searchParams.get('client_id')).toBe('12345');
    expect(url.searchParams.get('redirect_uri')).toBe('coreo://strava-connect');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('activity:read_all');
    expect(url.searchParams.get('state')).toBe('abc123');
    expect(url.searchParams.has('code_challenge')).toBe(false);
    expect(url.searchParams.has('code_challenge_method')).toBe(false);
  });
});
