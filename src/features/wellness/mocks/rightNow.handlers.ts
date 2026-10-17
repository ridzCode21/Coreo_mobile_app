import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockUser } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

function localDate(user: MockUser): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: user.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

registerMock('GET', '/users/me/right-now/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }
  const reading = mockDb.heartRateReadings[`${user.id}:${localDate(user)}`];
  if (reading === undefined || reading <= 100) {
    return { status: 200, body: { breath: null, message: 'Nothing to do.' } };
  }
  const breath = {
    eyebrow: 'Right now',
    headline: "Your heart's been running for twenty minutes. Let's slow it together.",
    cue: 'Breathe out',
    pattern: 'In for 4 · hold for 7 · out for 8',
    line: 'Nothing to pick. Just this, six times.',
    not_now: 'Not now',
    im_here: "I'm here",
    ...(!mockDb.wellnessProfiles[user.id]?.hide_numbers ? { heart_rate: reading } : {}),
  };
  return { status: 200, body: { breath } };
});
