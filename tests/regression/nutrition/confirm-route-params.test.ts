/**
 * Issue #23 — once the "Nutrition label" tile sends the user to `/diet/confirm?source=label_ocr`,
 * the confirm screen's route-param schema must accept that value or `ConfirmMealScreen` throws on
 * `confirmRouteParamsSchema.parse` before it ever renders (`src/features/nutrition/schemas.ts`).
 * `FoodSource` per `API_REFERENCE.md:959-960` is
 * `photo | barcode | manual | import | quick_add | label_ocr`; this only exercises the subset the
 * confirm route actually receives today.
 */

import { confirmRouteParamsSchema } from '@/features/nutrition/schemas';

describe('nutrition: confirmRouteParamsSchema (issue #23)', () => {
  it('accepts source "label_ocr" without throwing', () => {
    expect(() => confirmRouteParamsSchema.parse({ source: 'label_ocr' })).not.toThrow();
    expect(confirmRouteParamsSchema.parse({ source: 'label_ocr' })).toEqual({
      source: 'label_ocr',
    });
  });

  it('still accepts the existing photo, barcode, and manual sources (no regression)', () => {
    expect(confirmRouteParamsSchema.parse({ source: 'photo' }).source).toBe('photo');
    expect(confirmRouteParamsSchema.parse({ source: 'barcode' }).source).toBe('barcode');
    expect(confirmRouteParamsSchema.parse({ source: 'manual' }).source).toBe('manual');
  });

  it('still defaults to "manual" when no source is given', () => {
    expect(confirmRouteParamsSchema.parse({}).source).toBe('manual');
  });
});
