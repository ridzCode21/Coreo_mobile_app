import { memoryFactsPayloadSchema } from '@/features/profile/api/memoryFactsApi';

describe('profile notebook API contract', () => {
  it('accepts the backend’s bare five-field fact payload without synthesizing provenance', () => {
    const payload = memoryFactsPayloadSchema.parse({
      eyebrow: "Coreo's notebook",
      title: 'What I know about you.',
      subtitle: 'Correct me anytime.',
      footer:
        'This is everything I hold. Delete a line and I forget it. Delete it all and we start clean.',
      prompt: 'Something I got wrong? Tell me',
      facts: [
        {
          id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
          text: 'Vegetarian.',
          source_label: 'From your interview · March',
          stored_at: '2026-03-01T00:00:00+00:00',
          badge: null,
        },
      ],
    });

    expect(payload.facts[0].source_label).toBe('From your interview · March');
    expect(payload.facts[0].badge).toBeNull();
  });

  it('rejects a fact whose server response omits its required provenance', () => {
    expect(() =>
      memoryFactsPayloadSchema.parse({
        eyebrow: "Coreo's notebook",
        title: 'What I know about you.',
        subtitle: 'Correct me anytime.',
        footer:
          'This is everything I hold. Delete a line and I forget it. Delete it all and we start clean.',
        prompt: 'Something I got wrong? Tell me',
        facts: [{ id: '18e639d8-2454-4a94-8fd1-6c062729bf35', text: 'Vegetarian.' }],
      }),
    ).toThrow();
  });
});
