/**
 * Issue #56 — parses the deep link Strava's browser consent redirects back to
 * (`coreo://strava-connect?...`, app scheme `coreo` from app.config.ts). Only a URL matching our
 * own callback path is ever treated as a Strava result; any other URL (another deep link the app
 * already handles) must come back `null` so it is ignored, not misread as a Strava response.
 */
import {
  parseStravaRedirectUrl,
  STRAVA_REDIRECT_PATH,
} from '@/features/integrations/lib/strava/redirect';

describe('parseStravaRedirectUrl (issue #56)', () => {
  it('extracts the authorization code and state on success', () => {
    const result = parseStravaRedirectUrl(`coreo://${STRAVA_REDIRECT_PATH}?code=abc123&state=xyz`);
    expect(result).toEqual({ code: 'abc123', state: 'xyz' });
  });

  it('extracts an error and state when the person declines on Strava', () => {
    const result = parseStravaRedirectUrl(
      `coreo://${STRAVA_REDIRECT_PATH}?error=access_denied&state=xyz`,
    );
    expect(result).toEqual({ error: 'access_denied', state: 'xyz' });
  });

  it('returns null for a deep link that is not the Strava callback', () => {
    expect(parseStravaRedirectUrl('coreo://profile/manage-sources')).toBeNull();
  });

  it('returns null for a malformed URL instead of throwing', () => {
    expect(parseStravaRedirectUrl('not a url')).toBeNull();
  });

  it('returns null when neither code nor error is present', () => {
    expect(parseStravaRedirectUrl(`coreo://${STRAVA_REDIRECT_PATH}?state=xyz`)).toBeNull();
  });
});
