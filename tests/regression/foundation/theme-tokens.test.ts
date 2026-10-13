import { colors, radii, spacing } from '@/shared/theme/tokens';

describe('foundation: theme tokens', () => {
  it('keeps the brand ink colour used by primary text', () => {
    expect(colors.ink).toBe('#17191D');
  });

  it('never defines a red colour token (brand rule: no red anywhere)', () => {
    const redLike = Object.entries(colors).filter(([name, value]) => {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return false;
      const r = parseInt(value.slice(1, 3), 16);
      const g = parseInt(value.slice(3, 5), 16);
      const b = parseInt(value.slice(5, 7), 16);
      return r > 150 && g < 90 && b < 90 && name !== 'attention';
    });
    expect(redLike).toEqual([]);
  });

  it('exposes spacing and radius scales as positive numbers', () => {
    [...Object.values(spacing), ...Object.values(radii)].forEach((value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });
});
