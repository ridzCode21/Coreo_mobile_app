type BuildStravaAuthorizeUrlOptions = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export function buildStravaAuthorizeUrl({
  clientId,
  redirectUri,
  state,
}: BuildStravaAuthorizeUrlOptions): string {
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'activity:read_all');
  url.searchParams.set('state', state);
  return url.toString();
}
