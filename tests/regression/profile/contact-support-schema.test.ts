/**
 * Issue #179 — `contactSupportSchema` guards the Contact us form before anything reaches
 * `POST /core/contact-support/` (apps/core/serializers.py:21-31: `subject` max_length=200,
 * required; `message` required, no declared max). Acceptance criterion: "Empty subject or message
 * is blocked with a clear message."
 */

import { contactSupportSchema } from '@/features/profile/schemas';

function parse(values: { subject: string; message: string }) {
  return contactSupportSchema.safeParse(values);
}

describe('profile: contactSupportSchema (issue #179)', () => {
  it('accepts a normal subject and message', () => {
    const result = parse({ subject: "Can't log breakfast", message: 'The photo button crashes.' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty subject with a clear message', () => {
    const result = parse({ subject: '', message: 'Something is wrong.' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['Subject is required.']);
    }
  });

  it('rejects a whitespace-only subject the same as empty', () => {
    const result = parse({ subject: '   ', message: 'Something is wrong.' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['Subject is required.']);
    }
  });

  it('rejects an empty message with a clear message', () => {
    const result = parse({ subject: 'Bug report', message: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['Message is required.']);
    }
  });

  it('rejects a whitespace-only message the same as empty', () => {
    const result = parse({ subject: 'Bug report', message: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['Message is required.']);
    }
  });

  it('rejects a subject over 200 characters (serializers.py:22 max_length=200)', () => {
    const result = parse({ subject: 'x'.repeat(201), message: 'Still valid.' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual([
        'Subject must be 200 characters or fewer.',
      ]);
    }
  });

  it('accepts a subject at exactly 200 characters', () => {
    const result = parse({ subject: 'x'.repeat(200), message: 'Still valid.' });
    expect(result.success).toBe(true);
  });
});
