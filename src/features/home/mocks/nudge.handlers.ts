import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

registerMock('GET', '/users/me/nudge/', (request) => {
  if (!requireMockUser(request)) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return {
    status: 200,
    delayMs: 250,
    body: { nudge: null, message: null },
  };
});
