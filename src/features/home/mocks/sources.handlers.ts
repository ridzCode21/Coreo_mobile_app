import { DEVICE_SOURCES } from '@/features/home/api/sourceConstants';
import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

const MOCK_SOURCE_ORDER = [...DEVICE_SOURCES, 'whoop', 'oura'] as const;

registerMock('GET', '/integrations/sources/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return {
    status: 200,
    delayMs: 250,
    body: {
      success: true,
      sources: MOCK_SOURCE_ORDER.map((source) => {
        const connection = source === 'strava' ? mockDb.stravaConnections[user.id] : undefined;
        return {
          source,
          connected: Boolean(connection),
          last_synced_at: connection?.lastSyncedAt ?? null,
          synced_through: null,
          status: null,
        };
      }),
      last_night: {
        date: new Date().toISOString().slice(0, 10),
        sleep: null,
        recovery: null,
      },
    },
  };
});
