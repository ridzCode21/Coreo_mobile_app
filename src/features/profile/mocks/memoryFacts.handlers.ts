import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb, type MockMemoryFact } from '@/shared/api/mock/db';
import { registerMock } from '@/shared/api/mock/router';

const notebookCopy = {
  eyebrow: "Coreo's notebook",
  title: 'What I know about you.',
  subtitle: 'Correct me anytime.',
  footer:
    'This is everything I hold. Delete a line and I forget it. Delete it all and we start clean.',
  prompt: 'Something I got wrong? Tell me',
} as const;

function unauthorized() {
  return { status: 401, body: { error: 'authentication_required' } };
}

function factPayload(fact: MockMemoryFact) {
  return {
    id: fact.id,
    text: fact.text,
    source_label: fact.source_label,
    stored_at: fact.stored_at,
    badge: fact.badge,
  };
}

function error(
  code: 'text_required' | 'text_only' | 'text_too_long' | 'fact_not_found',
  status: 400 | 404,
) {
  return { status, body: { error: code } };
}

registerMock('GET', '/users/me/memory-facts/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const facts = mockDb.memoryFacts
    .filter((fact) => fact.userId === user.id)
    .sort((left, right) =>
      left.stored_at === right.stored_at
        ? left.id.localeCompare(right.id)
        : left.stored_at.localeCompare(right.stored_at),
    )
    .map(factPayload);
  return { status: 200, body: { ...notebookCopy, facts } };
});

registerMock('PATCH', '/users/me/memory-facts/:factId/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return error('text_required', 400);
  }
  const body = request.body as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== 'text')) return error('text_only', 400);
  if (typeof body.text !== 'string') return error('text_required', 400);
  const text = body.text.trim();
  if (!text) return error('text_required', 400);
  if (text.length > 500) return error('text_too_long', 400);
  const fact = mockDb.memoryFacts.find(
    (candidate) => candidate.id === request.params.factId && candidate.userId === user.id,
  );
  if (!fact) return error('fact_not_found', 404);
  fact.text = text;
  return { status: 200, body: factPayload(fact) };
});

registerMock('DELETE', '/users/me/memory-facts/:factId/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  const index = mockDb.memoryFacts.findIndex(
    (fact) => fact.id === request.params.factId && fact.userId === user.id,
  );
  if (index < 0) return error('fact_not_found', 404);
  mockDb.memoryFacts.splice(index, 1);
  return { status: 204 };
});

registerMock('DELETE', '/users/me/memory-facts/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();
  mockDb.memoryFacts = mockDb.memoryFacts.filter((fact) => fact.userId !== user.id);
  return { status: 204 };
});
