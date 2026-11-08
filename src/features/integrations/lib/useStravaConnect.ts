import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';

import { useConnectStravaMutation } from '@/features/integrations/api/stravaApi';
import { buildStravaAuthorizeUrl } from '@/features/integrations/lib/strava/authorizeUrl';
import { getStravaClientId } from '@/features/integrations/lib/strava/config';
import {
  stravaConnectErrorCode,
  stravaConnectErrorMessage,
} from '@/features/integrations/lib/strava/errors';
import {
  generateStravaCodeVerifier,
  generateStravaState,
} from '@/features/integrations/lib/strava/pkce';
import {
  parseStravaRedirectUrl,
  STRAVA_REDIRECT_PATH,
} from '@/features/integrations/lib/strava/redirect';

export type StravaConnectStatus = 'idle' | 'connecting' | 'exchanging' | 'success' | 'error';

type PendingAttempt = { state: string; codeVerifier: string };

export function useStravaConnect() {
  const { mutateAsync } = useConnectStravaMutation();
  const pendingAttempt = useRef<PendingAttempt | null>(null);
  const [status, setStatus] = useState<StravaConnectStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRedirect = useCallback(
    async (url: string) => {
      const redirect = parseStravaRedirectUrl(url);
      if (!redirect || !pendingAttempt.current) return;
      const attempt = pendingAttempt.current;
      pendingAttempt.current = null;

      if (!redirect.state || redirect.state !== attempt.state) {
        setStatus('error');
        setErrorMessage(stravaConnectErrorMessage(null));
        return;
      }
      if ('error' in redirect) {
        setStatus('error');
        setErrorMessage(
          redirect.error === 'access_denied'
            ? 'Connection cancelled.'
            : stravaConnectErrorMessage(null),
        );
        return;
      }

      setStatus('exchanging');
      try {
        await mutateAsync({ code: redirect.code, codeVerifier: attempt.codeVerifier });
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setErrorMessage(stravaConnectErrorMessage(stravaConnectErrorCode(error)));
      }
    },
    [mutateAsync],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleRedirect(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void handleRedirect(url);
    });
    return () => subscription.remove();
  }, [handleRedirect]);

  const connect = useCallback(async () => {
    const clientId = getStravaClientId();
    if (!clientId) {
      setStatus('error');
      setErrorMessage(stravaConnectErrorMessage('STRAVA_NOT_CONFIGURED'));
      return;
    }

    try {
      const state = generateStravaState();
      const codeVerifier = generateStravaCodeVerifier();
      pendingAttempt.current = { state, codeVerifier };
      setErrorMessage(null);
      setStatus('connecting');
      const redirectUri = Linking.createURL(STRAVA_REDIRECT_PATH);
      await Linking.openURL(buildStravaAuthorizeUrl({ clientId, redirectUri, state }));
    } catch {
      pendingAttempt.current = null;
      setStatus('error');
      setErrorMessage(stravaConnectErrorMessage(null));
    }
  }, []);

  return { connect, status, errorMessage };
}
