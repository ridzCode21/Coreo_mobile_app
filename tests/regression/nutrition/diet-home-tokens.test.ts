/**
 * Issue #22 — Diet home (14a) needs several new typography tokens that don't exist yet
 * (design-spec.md lines 13-30, markup lines 56-105): the headline's 400-weight accent span, the
 * 38px "Left today" kcal number, the weight-chip/card-hint/kcal-unit/macro-row sizes, and the next
 * meal / reassurance text sizes. `colors.ink65` is new too (the ink ramp jumps .62 → .70, but the
 * reassurance strip text is `rgba(23,25,29,.65)`).
 */

import { colors, componentSizes, typography } from '@/shared/theme/tokens';

describe('nutrition: Diet home design tokens (issue #22)', () => {
  it('adds dietHeadlineAccent — 25px/400, matching the lead span size/spacing/line-height', () => {
    expect(typography.dietHeadlineAccent).toEqual({
      fontSize: 25,
      fontWeight: '400',
      letterSpacing: -0.5,
      lineHeight: 1.4,
    });
  });

  it('adds kcalHero — 38px/200/-1 for the "Left today" number', () => {
    expect(typography.kcalHero).toEqual({
      fontSize: 38,
      fontWeight: '200',
      letterSpacing: -1,
    });
  });

  it('adds weightChip — 10px/400/0.6 for the "78 → 72" chip', () => {
    expect(typography.weightChip).toEqual({
      fontSize: 10,
      fontWeight: '400',
      letterSpacing: 0.6,
    });
  });

  it('adds cardHint — 10px/300 for "Adjusts as I learn you"', () => {
    expect(typography.cardHint).toEqual({
      fontSize: 10,
      fontWeight: '300',
      letterSpacing: 0,
    });
  });

  it('adds kcalUnit — 12px/300 for the "kcal" unit label', () => {
    expect(typography.kcalUnit).toEqual({
      fontSize: 12,
      fontWeight: '300',
      letterSpacing: 0,
    });
  });

  it('adds macroRow — 10px/400 for the Protein/Carbs/Fat label+value row', () => {
    expect(typography.macroRow).toEqual({
      fontSize: 10,
      fontWeight: '400',
      letterSpacing: 0,
    });
  });

  it('adds nextMealTitle — 15px/400 for the next meal name', () => {
    expect(typography.nextMealTitle).toEqual({
      fontSize: 15,
      fontWeight: '400',
      letterSpacing: 0,
    });
  });

  it('adds nextMealSubtitle — 11px/300 for the next meal macro line', () => {
    expect(typography.nextMealSubtitle).toEqual({
      fontSize: 11,
      fontWeight: '300',
      letterSpacing: 0,
    });
  });

  it('adds reassuranceText — 11px/300/line-height x1.6 for the calm strip', () => {
    expect(typography.reassuranceText).toEqual({
      fontSize: 11,
      fontWeight: '300',
      letterSpacing: 0,
      lineHeight: 1.6,
    });
  });

  it('adds colors.ink65 — rgba(23,25,29,0.65)', () => {
    expect(colors.ink65).toBe('rgba(23,25,29,0.65)');
  });

  it('keeps the log-pill and voice-submit glow radii at their distinct design values', () => {
    expect(componentSizes.dietLogPillGlowRadius).toBe(24);
    expect(componentSizes.dietVoiceSubmitGlowRadius).toBe(20);
  });
});
