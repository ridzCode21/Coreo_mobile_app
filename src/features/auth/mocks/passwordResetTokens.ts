import { mockDb, type MockUser } from '@/shared/api/mock/db';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function tokenValue(user: MockUser): string {
  return `${user.id}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function issuePasswordResetToken(user: MockUser): string {
  const token = tokenValue(user);
  mockDb.passwordResetTokens[token] = {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
    used: false,
  };
  return token;
}

export function checkPasswordResetToken(token: string): MockUser | null {
  const record = mockDb.passwordResetTokens[token];
  if (!record || record.used || record.expiresAt <= Date.now()) return null;
  return mockDb.users.find((user) => user.id === record.userId) ?? null;
}

export function spendPasswordResetToken(token: string): void {
  const record = mockDb.passwordResetTokens[token];
  if (record) record.used = true;
}

export function __latestPasswordResetTokenForTests(email: string): string | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  const matches = Object.entries(mockDb.passwordResetTokens).filter(
    ([, record]) => record.email.toLowerCase() === normalizedEmail,
  );
  return matches.at(-1)?.[0];
}
