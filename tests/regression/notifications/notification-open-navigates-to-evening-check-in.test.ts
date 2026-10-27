/**
 * Issue #46 — plan.md Decision 13. `notificationResponses.ts`'s own comment and the #47 commit
 * both flag this exact gap: "Open has no check-in screen to go to until #46." Confirms
 * `handleNotificationResponse` now navigates to the new screen for the Open action/banner tap,
 * while its existing return contract (`'answered' | 'open' | 'ignored'`, see
 * `lock-screen-answer.test.ts`) is unchanged.
 */

import type * as Notifications from 'expo-notifications';

import '@/shared/api/mock/registerAllMocks';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { secureAuthTokenStore } from '@/shared/api/authTokenStore';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import {
  __resetHandledResponsesForTests,
  handleNotificationResponse,
} from '@/features/notifications/lib/notificationResponses';
import { seedMockCheckInNotice } from '@/features/notifications/mocks/checkInNotices.handlers';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

function response(
  actionIdentifier: string,
  data: Record<string, unknown> | null,
  id = 'push-1',
): Notifications.NotificationResponse {
  return {
    actionIdentifier,
    notification: { request: { identifier: id, content: { data } } },
  } as unknown as Notifications.NotificationResponse;
}

async function signIn() {
  const user: MockUser = {
    id: 'u1',
    email: 'maya@example.com',
    password: 'unused',
    first_name: 'Maya',
    last_name: 'Chen',
    phone: null,
    date_of_birth: null,
    gender: null,
    timezone: 'UTC',
    is_premium: false,
    email_verified: true,
    phone_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  mockDb.users.push(user);
  await secureAuthTokenStore.setTokens(issueTokenPair(user));
  return user;
}

describe('notification open action navigates to the evening check-in screen (#46)', () => {
  beforeEach(async () => {
    __resetMockDbForTests();
    __resetHandledResponsesForTests();
    mockPush.mockClear();
  });

  it('navigates to /evening-check-in on an Open tap, and still resolves "open"', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };

    await expect(handleNotificationResponse(response('open', data))).resolves.toBe('open');

    expect(mockPush).toHaveBeenCalledWith('/evening-check-in');
  });

  it('navigates on a banner tap (the default action identifier) too', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };

    await handleNotificationResponse(response(DEFAULT_ACTION, data));

    expect(mockPush).toHaveBeenCalledWith('/evening-check-in');
  });

  it('does not navigate twice for a duplicate delivery of the same tap', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };

    await handleNotificationResponse(response('open', data, 'same-id'));
    await handleNotificationResponse(response('open', data, 'same-id'));

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('does not navigate on a Good/Rough answer tap (those answer, they do not open)', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };

    await handleNotificationResponse(response('good', data));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
