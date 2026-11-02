import {
  authErrorMessage,
  isAuthNetworkError,
  NETWORK_ERROR_MESSAGE,
} from '@/features/auth/api/authApi';
import { ApiError } from '@/shared/api/errors';

/**
 * Issue #167 — "Server down shows a raw Java error and the server address". With the backend
 * unreachable, `src/shared/api/client.ts:108-119` wraps the rejected `fetch` into
 * `ApiError.network(cause)` (src/shared/api/errors.ts:33-35), storing the raw JS `Error`
 * (`fetch failed: java.io.IOException… http://localhost:8000/...`) in `.details`. But
 * `authErrorMessage` (src/features/auth/api/authApi.ts:208-226) read `.details.message` *before*
 * falling back to `error.message`, and a plain `Error` has a `.message` string too — so the raw
 * technical text leaked straight into the sign-in/signup banner. This locks in a fixed,
 * non-technical message for the network case, independent of whatever `.details` holds, while
 * leaving real backend error messages (non-network `ApiError`s, where `.details` is the parsed
 * response body) untouched.
 */
describe('authErrorMessage / isAuthNetworkError — network-unreachable case (issue #167)', () => {
  it('returns the fixed plain message for a network error, ignoring the raw fetch failure', () => {
    const cause = new TypeError(
      'fetch failed: java.io.IOException: Failed to connect to localhost/127.0.0.1:8000',
    );
    const error = ApiError.network(cause);

    expect(authErrorMessage(error, 'fallback')).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('returns the fixed message even when the cause has no message at all', () => {
    expect(authErrorMessage(ApiError.network(), 'fallback')).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('never contains an exception name or a URL', () => {
    expect(NETWORK_ERROR_MESSAGE).not.toMatch(/java\.io|exception|https?:\/\/|localhost/i);
  });

  it('still surfaces the real backend message for a non-network ApiError (e.g. 401)', () => {
    const error = new ApiError('Invalid email or password', 'unauthorized', 401, {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });

    expect(authErrorMessage(error, 'fallback')).toBe('Invalid email or password');
  });

  it('flags a network ApiError as retryable', () => {
    expect(isAuthNetworkError(ApiError.network())).toBe(true);
  });

  it('does not flag a non-network ApiError, or a non-ApiError, as retryable', () => {
    expect(isAuthNetworkError(new ApiError('x', 'unauthorized', 401))).toBe(false);
    expect(isAuthNetworkError(new Error('boom'))).toBe(false);
  });
});
