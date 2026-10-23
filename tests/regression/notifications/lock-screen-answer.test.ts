/**
 * Issue #47 — end to end through the mock API: Good and Rough from the lock screen answer the
 * notice, Open and a banner tap send nothing, a repeated delivery is ignored, a missing or
 * unknown notice never crashes, and an answer made offline is kept and sent when back online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as Notifications from 'expo-notifications';

import '@/shared/api/mock/registerAllMocks';
import { secureAuthTokenStore } from '@/shared/api/authTokenStore';
import { mockDb, __resetMockDbForTests, type MockUser } from '@/shared/api/mock/db';
import { issueTokenPair } from '@/shared/api/mock/tokens';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { STORAGE_KEYS } from '@/shared/lib/storage';
import {
  __resetHandledResponsesForTests,
  flushPendingAnswers,
  handleNotificationResponse,
} from '@/features/notifications/lib/notificationResponses';
import { seedMockCheckInNotice } from '@/features/notifications/mocks/checkInNotices.handlers';

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

describe('lock screen answers', () => {
  beforeEach(async () => {
    __resetMockDbForTests();
    __resetHandledResponsesForTests();
    await AsyncStorage.clear();
    useConnectivityStore.getState().setSimulatedOffline(false);
  });

  it('Good answers the notice without anything else', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    await expect(
      handleNotificationResponse(response('good', { id: notice.id, kind: notice.kind })),
    ).resolves.toBe('answered');
    expect(notice.answer).toBe('good');
  });

  it('Rough answers the notice', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    await handleNotificationResponse(response('rough', { id: notice.id, kind: notice.kind }));
    expect(notice.answer).toBe('rough');
  });

  it('Open and a tap on the banner send no answer', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };
    await expect(handleNotificationResponse(response('open', data, 'a'))).resolves.toBe('open');
    await expect(handleNotificationResponse(response(DEFAULT_ACTION, data, 'b'))).resolves.toBe(
      'open',
    );
    expect(notice.answer).toBeNull();
  });

  it('ignores the same tap delivered twice (listener and last response)', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const tap = response('good', { id: notice.id, kind: notice.kind });
    await expect(handleNotificationResponse(tap)).resolves.toBe('answered');
    notice.answer = null;
    await expect(handleNotificationResponse(tap)).resolves.toBe('ignored');
    expect(notice.answer).toBeNull();
  });

  it('does nothing when the notice id is missing, and keeps nothing', async () => {
    await signIn();
    await expect(handleNotificationResponse(response('good', {}))).resolves.toBe('ignored');
    await expect(handleNotificationResponse(response('good', null, 'z'))).resolves.toBe('ignored');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.pendingCheckInAnswers)).toBeNull();
  });

  it('a notice the server does not know is dropped, not retried', async () => {
    await signIn();
    const unknown = '99999999-9999-4999-8999-999999999999';
    await handleNotificationResponse(response('good', { id: unknown, kind: 'evening_check_in' }));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.pendingCheckInAnswers)).toBeNull();
  });

  it('answering an already answered notice just overwrites it', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    const data = { id: notice.id, kind: notice.kind };
    await handleNotificationResponse(response('good', data, 'a'));
    await handleNotificationResponse(response('rough', data, 'b'));
    expect(notice.answer).toBe('rough');
  });

  it('keeps an answer made offline and sends it when the connection is back', async () => {
    await signIn();
    const notice = seedMockCheckInNotice('u1', 'device-1');
    useConnectivityStore.getState().setSimulatedOffline(true);
    await handleNotificationResponse(response('rough', { id: notice.id, kind: notice.kind }));
    expect(notice.answer).toBeNull();
    const saved = JSON.parse(
      (await AsyncStorage.getItem(STORAGE_KEYS.pendingCheckInAnswers)) ?? '[]',
    ) as { noticeId: string; answer: string }[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ noticeId: notice.id, answer: 'rough' });
    // Only the id and the answer are written, never the push token or the account.
    expect(Object.keys(saved[0]).sort()).toEqual(['answer', 'createdAt', 'noticeId']);

    useConnectivityStore.getState().setSimulatedOffline(false);
    await flushPendingAnswers();
    expect(notice.answer).toBe('rough');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.pendingCheckInAnswers)).toBeNull();
  });
});
