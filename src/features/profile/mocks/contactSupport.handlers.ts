import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockSupportRequest } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

const categories = ['bug', 'feature', 'support', 'other'] as const;

function unauthorized() {
  return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Matches ContactSupportSerializer and contact_support in the backend snapshot. */
registerMock('POST', '/core/contact-support/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();

  const body = (request.body ?? {}) as Record<string, unknown>;
  const subject = asString(body.subject);
  const message = asString(body.message);
  const category = asString(body.category);
  const attachLogs = body.attach_logs;
  const details: Record<string, string[]> = {};

  if (!subject) details.subject = ['This field may not be blank.'];
  else if (subject.length > 200)
    details.subject = ['Ensure this field has no more than 200 characters.'];
  if (!message) details.message = ['This field may not be blank.'];
  if (!categories.includes(category as (typeof categories)[number])) {
    details.category = ['"' + category + '" is not a valid choice.'];
  }
  if (attachLogs !== undefined && typeof attachLogs !== 'boolean') {
    details.attach_logs = ['Must be a valid boolean.'];
  }

  if (Object.keys(details).length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid support request data', details),
    };
  }

  const requestRecord: MockSupportRequest = {
    userId: user.id,
    subject,
    message,
    category: category as MockSupportRequest['category'],
    attachLogs: attachLogs === true,
  };
  mockDb.supportRequests.push(requestRecord);
  const submittedAt = new Date().toISOString();
  return {
    status: 200,
    body: {
      success: true,
      data: {
        support_request: {
          id: `SR-${submittedAt.slice(0, 10).replaceAll('-', '')}-${user.id}`,
          subject,
          category,
          submitted_at: submittedAt,
        },
      },
      message: 'Support request submitted successfully.',
    },
  };
});
