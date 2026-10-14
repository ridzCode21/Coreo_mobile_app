import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';
import { DEVICE_SOURCES } from '@/features/home/api/sourcesApi';

registerMock('GET', '/integrations/sources/', (request) => {
  if (!requireMockUser(request)) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return {
    status: 200,
    delayMs: 250,
    body: {
      success: true,
      sources: DEVICE_SOURCES.map((source) => ({
        source,
        connected: false,
        last_synced_at: null,
        synced_through: null,
      })),
    },
  };
});
