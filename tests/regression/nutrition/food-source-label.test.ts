/**
 * Issue #38 — "Search rows show the OpenFoodFacts label for catalog items." The label rule is
 * `source !== 'custom'` (mirrors the backend's `owner IS NULL` vs `owner = request.user` split,
 * apps/food_tracking/views.py:81-83 + models.py:23), not a literal `'off'` string match, so any
 * non-custom source value (today: `'off'`) renders the pill.
 */

import { isCatalogFoodSource } from '@/features/nutrition/lib/foodSource';

describe('nutrition: isCatalogFoodSource (issue #38)', () => {
  it('is false for a user-owned custom food', () => {
    expect(isCatalogFoodSource('custom')).toBe(false);
  });

  it('is true for the backend default catalog source', () => {
    expect(isCatalogFoodSource('off')).toBe(true);
  });

  it('is true for any other non-custom source value', () => {
    expect(isCatalogFoodSource('mock-generic')).toBe(true);
    expect(isCatalogFoodSource('')).toBe(true);
  });
});
