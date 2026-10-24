import { DEVICE_SOURCES } from '@/features/home/api/sourceConstants';
import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

const MOCK_SOURCE_ORDER = [...DEVICE_SOURCES, 'whoop', 'oura'] as const;

registerMock('GET', '/integrations/sources/', (request) => {
  if (!requireMockUser(request)) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return {
    status: 200,
    delayMs: 250,
    body: {
      success: true,
      sources: MOCK_SOURCE_ORDER.map((source) => ({
        source,
        connected: false,
        last_synced_at: null,
        synced_through: null,
        status: null,
      })),
      last_night: {
        date: new Date().toISOString().slice(0, 10),
        sleep: null,
        recovery: null,
      },
    },
  };
});
