import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { verifyMockToken } from '@/shared/api/mock/tokens';
import type { MockRequest } from '@/shared/api/mock/router';

/**
 * Resolves the calling `MockUser` from a request's `Authorization: Bearer <token>` header — the
 * mock's equivalent of the real API's request-auth middleware. Returns `null` for a missing,
 * malformed, expired, or blacklisted token so handlers can respond `401` (API_REFERENCE.md §1:
 * "All endpoints require authentication by default").
 */
export function requireMockUser(request: MockRequest): MockUser | null {
  const header = request.headers.Authorization ?? request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) return null;

  const payload = verifyMockToken(token, 'access');
  if (!payload) return null;

  return mockDb.users.find((user) => user.id === payload.user_id) ?? null;
}
