import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

import { insightsResponseSchema, type InsightsResponse } from '@/features/patterns/api/insightsApi';

const defaultResponse: InsightsResponse = {
  status: 'not_enough_data',
  days_logged: 0,
  days_remaining: 30,
};

let mockInsightsResponse: InsightsResponse = defaultResponse;

export function setMockInsightsResponse(response: unknown | null): void {
  mockInsightsResponse =
    response === null ? defaultResponse : insightsResponseSchema.parse(response);
}

registerMock('GET', '/insights/', (request) => {
  if (!requireMockUser(request)) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return { status: 200, body: styleB(mockInsightsResponse) };
});
