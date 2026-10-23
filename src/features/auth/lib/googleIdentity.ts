import Constants from 'expo-constants';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  type ConfigureParams,
} from '@react-native-google-signin/google-signin';
import { apiMode } from '@/shared/api/transport';
import type { ApiMode } from '@/shared/api/config';
import { encodeMockGoogleIdentityToken } from '@/features/auth/lib/googleMockToken';
import { splitName } from '@/shared/lib/name';

/** Google sign-in can't run: the app has no Google client ID, or Google Play services is missing. */
export class GoogleSignInUnavailableError extends Error {
  constructor() {
    super('Google sign-in is not available on this device.');
    this.name = 'GoogleSignInUnavailableError';
  }
}

/** The person closed the Google sheet. Not a failure: callers should stay quiet. */
export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelledError';
  }
}

/** The phone could not reach Google. */
export class GoogleSignInNetworkError extends Error {
  constructor() {
    super('Could not reach Google.');
    this.name = 'GoogleSignInNetworkError';
  }
}

export type GoogleIdentity = {
  identityToken: string;
  firstName: string;
  lastName: string;
};

/** Android's GoogleSignInStatusCodes.NETWORK_ERROR. */
const ANDROID_NETWORK_ERROR_CODE = '7';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

let configured = false;

function configureGoogleSignIn(): void {
  if (configured) return;
  const extra = Constants.expoConfig?.extra;
  const webClientId = readString(extra?.googleWebClientId);
  const iosClientId = readString(extra?.googleIosClientId);
  // The backend verifies the token against its own (web) client ID, so that must be the audience.
  if (!webClientId) throw new GoogleSignInUnavailableError();
  const options: ConfigureParams = { webClientId, ...(iosClientId ? { iosClientId } : {}) };
  GoogleSignin.configure(options);
  configured = true;
}

function translateGoogleError(error: unknown): Error {
  if (
    error instanceof GoogleSignInUnavailableError ||
    error instanceof GoogleSignInCancelledError ||
    error instanceof GoogleSignInNetworkError
  ) {
    return error;
  }
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) return new GoogleSignInCancelledError();
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new GoogleSignInUnavailableError();
    }
    if (
      error.code === ANDROID_NETWORK_ERROR_CODE ||
      /network|internet|offline/i.test(error.message)
    ) {
      return new GoogleSignInNetworkError();
    }
  }
  return error instanceof Error ? error : new Error('Google sign-in failed.');
}

/**
 * Returns a Google identity token (`idToken`) for `POST /users/google/`. In mock mode it makes an
 * opaque stand-in so the flow works without Google. The token goes straight to the backend and is
 * never stored on the device.
 */
export async function getGoogleIdentityToken(
  fallbackName: string,
  mode: ApiMode = apiMode,
): Promise<GoogleIdentity> {
  const typedName = splitName(fallbackName);

  if (mode === 'mock') {
    return {
      identityToken: encodeMockGoogleIdentityToken(typedName),
      firstName: typedName.firstName,
      lastName: typedName.lastName,
    };
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') throw new GoogleSignInCancelledError();

    const { idToken, user } = response.data;
    // No token means Google gave us nothing the backend can verify.
    if (!idToken) throw new GoogleSignInUnavailableError();
    // The name typed in the interview wins; Google's name fills in only when none was typed.
    const hasTypedName = fallbackName.trim().length > 0;
    return {
      identityToken: idToken,
      firstName: hasTypedName ? typedName.firstName : (user.givenName ?? typedName.firstName),
      lastName: hasTypedName ? typedName.lastName : (user.familyName ?? ''),
    };
  } catch (error) {
    throw translateGoogleError(error);
  }
}
