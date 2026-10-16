import { formatUsualsHeadline, usualsRowCopy } from '@/features/nutrition/lib/usualsCopy';
import type { UsualsResponse } from '@/features/nutrition/schemas';

type Suggestion = UsualsResponse['suggestions'][number];

const repeat: Suggestion = {
  kind: 'repeat',
  food_name: 'Poha with peanuts + chai',
  meal_type: 'breakfast',
  calories: 380,
  protein_g: 12,
  carbs_g: 54,
  fat_g: 13,
  portion_g: 310,
  food_item: null,
  reason_label: 'Most weekday mornings',
  times_logged: 5,
  last_logged_on: '2026-10-15',
};

describe('nutrition: usuals copy (issue #28)', () => {
  it.each([
    ['2026-10-13T08:40:00+05:30', '8:40 on a Tuesday.'],
    ['2026-10-13T05:07:00+05:30', '5:07 on a Tuesday.'],
    ['2026-10-13T00:00:00-07:00', '12:00 on a Tuesday.'],
    ['2026-10-18T23:05:00+14:00', '11:05 on a Sunday.'],
  ])(
    'formats the API-local fields in %s without device-timezone conversion',
    (observedAt, copy) => {
      expect(formatUsualsHeadline(observedAt)).toBe(copy);
    },
  );

  it('uses food first for repeat suggestions', () => {
    expect(usualsRowCopy(repeat)).toEqual({
      title: 'Poha with peanuts + chai',
      subtitle: 'Most weekday mornings · 380 kcal',
    });
  });

  it('uses the reason first for yesterday suggestions', () => {
    expect(
      usualsRowCopy({
        ...repeat,
        kind: 'yesterday',
        food_name: 'Idli, sambar, filter coffee',
        calories: 410,
        reason_label: "Yesterday's breakfast again",
      }),
    ).toEqual({
      title: "Yesterday's breakfast again",
      subtitle: 'Idli, sambar, filter coffee · 410 kcal',
    });
  });
});
