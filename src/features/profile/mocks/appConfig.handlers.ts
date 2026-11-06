import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

/** Matches client_config in the backend snapshot. */
registerMock('GET', '/core/config/', (request) => {
  if (!requireMockUser(request)) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        config: {
          features: {},
          settings: {
            max_file_upload_size: 10 * 1024 * 1024,
            support_email: 'support@med_app.com',
            privacy_policy_url: 'https://med_app.com/privacy',
            terms_url: 'https://med_app.com/terms',
          },
        },
      },
    },
  };
});
