import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb } from '@/shared/api/mock/db';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

function unauthorized() {
  return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
}

registerMock('GET', '/users/me/data/export/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  return {
    status: 200,
    body: {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, first_name: user.first_name },
      profile: {
        diet: mockDb.dietProfiles[user.id] ?? null,
        fitness: mockDb.fitnessProfiles[user.id] ?? null,
        wellness: mockDb.wellnessProfiles[user.id] ?? null,
      },
    },
  };
});

registerMock('DELETE', '/users/me/data/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  delete mockDb.dietProfiles[user.id];
  delete mockDb.fitnessProfiles[user.id];
  delete mockDb.wellnessProfiles[user.id];
  return { status: 204 };
});

registerMock('DELETE', '/users/me/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  mockDb.users = mockDb.users.filter((candidate) => candidate.id !== user.id);
  delete mockDb.dietProfiles[user.id];
  delete mockDb.fitnessProfiles[user.id];
  delete mockDb.wellnessProfiles[user.id];
  return { status: 204 };
});
