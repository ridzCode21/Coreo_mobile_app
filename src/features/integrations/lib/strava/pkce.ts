const PKCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const VERIFIER_LENGTH = 64;
const STATE_BYTE_LENGTH = 32;

function secureRandomBytes(length: number): Uint8Array {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new Error('Web Crypto is unavailable');
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateStravaCodeVerifier(): string {
  const randomBytes = secureRandomBytes(VERIFIER_LENGTH);
  let verifier = '';
  for (let index = 0; index < VERIFIER_LENGTH; index += 1) {
    verifier += PKCE_CHARS[randomBytes[index] % PKCE_CHARS.length];
  }
  return verifier;
}

export function generateStravaState(): string {
  return Array.from(secureRandomBytes(STATE_BYTE_LENGTH), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
