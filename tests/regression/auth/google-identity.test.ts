import {
  decodeMockGoogleIdentityToken,
  encodeMockGoogleIdentityToken,
} from '@/features/auth/lib/googleMockToken';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleSignInCancelledError,
  GoogleSignInNetworkError,
  GoogleSignInUnavailableError,
  getGoogleIdentityToken,
} from '@/features/auth/lib/googleIdentity';

let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));

/**
 * Issue #13 — the real `POST /users/google/` (apps/users/urls.py:28) needs a genuine Google ID
 * token from the device, which this repo cannot produce yet (no Google Sign-In SDK installed, no
 * `GOOGLE_CLIENT_ID` configured — see plan.md Decision log and blocked.txt). `getGoogleIdentityToken`
 * is the single seam: in mock mode it fabricates an opaque stand-in token so the rest of the flow
 * (mutation, mock handler, screen) is fully testable; outside mock mode it must fail loudly
 * instead of SaveScreen silently faking an `@mock.coreo.app` account, which is the bug this issue
 * fixes.
 */
describe('google mock identity token codec', () => {
  it('round-trips an email, given name, and family name through the opaque mock token', () => {
    const token = encodeMockGoogleIdentityToken({ firstName: 'Maya', lastName: 'Chen' });
    const decoded = decodeMockGoogleIdentityToken(token);

    expect(decoded).toEqual(
      expect.objectContaining({
        email: expect.stringContaining('@mock.coreo.app'),
        emailVerified: true,
        givenName: 'Maya',
        familyName: 'Chen',
      }),
    );
    expect(typeof decoded?.subject).toBe('string');
    expect(decoded?.subject.length).toBeGreaterThan(0);
  });

  it('gives every encoded token a unique subject, like real Google account identifiers', () => {
    const first = decodeMockGoogleIdentityToken(
      encodeMockGoogleIdentityToken({ firstName: 'Maya', lastName: 'Chen' }),
    );
    const second = decodeMockGoogleIdentityToken(
      encodeMockGoogleIdentityToken({ firstName: 'Maya', lastName: 'Chen' }),
    );
    expect(first?.subject).not.toBe(second?.subject);
  });

  it('falls back to "Friend" when there is no first name to encode, never an empty given name', () => {
    const decoded = decodeMockGoogleIdentityToken(
      encodeMockGoogleIdentityToken({ firstName: '', lastName: '' }),
    );
    expect(decoded?.givenName).toBe('Friend');
  });

  it('rejects a token it did not produce, like the real verifier rejects a malformed JWT (provider_tokens.py)', () => {
    expect(decodeMockGoogleIdentityToken('not-a-real-token')).toBeNull();
    expect(decodeMockGoogleIdentityToken('')).toBeNull();
    expect(decodeMockGoogleIdentityToken(undefined)).toBeNull();
    expect(decodeMockGoogleIdentityToken('mockgoogle:{not json')).toBeNull();
  });
});

describe('getGoogleIdentityToken by API mode (issue #13)', () => {
  it('builds a usable mock identity in mock mode', async () => {
    const identity = await getGoogleIdentityToken('Maya Chen', 'mock');

    expect(identity.firstName).toBe('Maya');
    expect(identity.lastName).toBe('Chen');
    expect(decodeMockGoogleIdentityToken(identity.identityToken)).toEqual(
      expect.objectContaining({ givenName: 'Maya', familyName: 'Chen' }),
    );
  });
});

describe('getGoogleIdentityToken in live mode (issue #13)', () => {
  const signInMock = GoogleSignin.signIn as jest.Mock;

  beforeEach(() => {
    signInMock.mockClear();
    mockExtra = { googleWebClientId: 'web-id.apps.googleusercontent.com' };
  });

  it('returns the real Google idToken and keeps the name typed in the interview', async () => {
    const identity = await getGoogleIdentityToken('Sam Lee', 'live');
    expect(identity).toEqual({
      identityToken: 'mock-google-id-token',
      firstName: 'Sam',
      lastName: 'Lee',
    });
    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: 'web-id.apps.googleusercontent.com' }),
    );
  });

  it('treats closing the Google sheet as a cancel, not a failure', async () => {
    signInMock.mockResolvedValueOnce({ type: 'cancelled', data: null });
    await expect(getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      GoogleSignInCancelledError,
    );
    signInMock.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED', message: 'cancelled' });
    await expect(getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      GoogleSignInCancelledError,
    );
  });

  it('maps a network failure to a network error', async () => {
    signInMock.mockRejectedValueOnce(
      Object.assign(new Error('A network error occurred'), { code: '7' }),
    );
    await expect(getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      GoogleSignInNetworkError,
    );
  });

  it('maps missing Google Play services and a missing idToken to unavailable', async () => {
    signInMock.mockRejectedValueOnce({ code: 'PLAY_SERVICES_NOT_AVAILABLE', message: 'x' });
    await expect(getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      GoogleSignInUnavailableError,
    );
    signInMock.mockResolvedValueOnce({ type: 'success', data: { idToken: null, user: {} } });
    await expect(getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      GoogleSignInUnavailableError,
    );
  });

  it('is unavailable when no web client ID is configured', async () => {
    jest.resetModules();
    mockExtra = {};
    const fresh = jest.requireActual<typeof import('@/features/auth/lib/googleIdentity')>(
      '@/features/auth/lib/googleIdentity',
    );
    await expect(fresh.getGoogleIdentityToken('Sam', 'live')).rejects.toBeInstanceOf(
      fresh.GoogleSignInUnavailableError,
    );
  });
});
