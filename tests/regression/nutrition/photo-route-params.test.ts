import {
  photoReceiptRouteParamsSchema,
  photoResultRouteParamsSchema,
} from '@/features/nutrition/schemas';

describe('nutrition: after-snap route params (issue #25)', () => {
  it('requires a non-empty local photo uri and serialized result prefill', () => {
    expect(
      photoResultRouteParamsSchema.parse({ photoUri: 'file://plate.jpg', prefill: '{}' }),
    ).toEqual({ photoUri: 'file://plate.jpg', prefill: '{}' });
    expect(() => photoResultRouteParamsSchema.parse({ photoUri: '', prefill: '{}' })).toThrow();
  });

  it('requires a serialized receipt summary', () => {
    expect(photoReceiptRouteParamsSchema.parse({ summary: '{}' })).toEqual({ summary: '{}' });
    expect(() => photoReceiptRouteParamsSchema.parse({ summary: '' })).toThrow();
  });
});
