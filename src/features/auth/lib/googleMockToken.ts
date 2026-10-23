type MockGoogleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
};

type MockGoogleIdentityValues = {
  firstName: string;
  lastName: string;
  email?: string;
};

const TOKEN_PREFIX = 'mockgoogle:';

function uniqueValue(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mock-only stand-in for a Google ID token. It deliberately has no JWT-like semantics: the
 * live backend remains responsible for verifying a real provider token.
 */
export function encodeMockGoogleIdentityToken(values: MockGoogleIdentityValues): string {
  const subject = `google_${uniqueValue()}`;
  const givenName = values.firstName.trim() || 'Friend';
  const familyName = values.lastName.trim();
  const email = values.email?.trim().toLowerCase() || `${subject}@mock.coreo.app`;

  return `${TOKEN_PREFIX}${encodeURIComponent(
    JSON.stringify({ subject, email, emailVerified: true, givenName, familyName }),
  )}`;
}

export function decodeMockGoogleIdentityToken(value: unknown): MockGoogleIdentity | null {
  if (typeof value !== 'string' || !value.startsWith(TOKEN_PREFIX)) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value.slice(TOKEN_PREFIX.length)));
    if (!parsed || typeof parsed !== 'object') return null;

    const identity = parsed as Record<string, unknown>;
    if (
      typeof identity.subject !== 'string' ||
      !identity.subject ||
      typeof identity.email !== 'string' ||
      !identity.email ||
      identity.emailVerified !== true ||
      typeof identity.givenName !== 'string' ||
      !identity.givenName ||
      typeof identity.familyName !== 'string'
    ) {
      return null;
    }

    return {
      subject: identity.subject,
      email: identity.email,
      emailVerified: true,
      givenName: identity.givenName,
      familyName: identity.familyName,
    };
  } catch {
    return null;
  }
}
