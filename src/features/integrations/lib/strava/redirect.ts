export const STRAVA_REDIRECT_PATH = 'strava-connect';

export type StravaRedirect =
  { code: string; state: string | null } | { error: string; state: string | null };

export function parseStravaRedirectUrl(url: string): StravaRedirect | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'coreo:' || parsed.hostname !== STRAVA_REDIRECT_PATH) return null;

    const state = parsed.searchParams.get('state');
    const code = parsed.searchParams.get('code');
    if (code) return { code, state };

    const error = parsed.searchParams.get('error');
    return error ? { error, state } : null;
  } catch {
    return null;
  }
}
