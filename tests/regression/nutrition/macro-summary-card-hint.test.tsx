/**
 * Issue #31 — `MacroSummaryCard` gains an optional `hint` prop so design 28c's "Left today" card
 * (design-spec.md:142-150, no "Adjusts as I learn you" line) can reuse the exact same component and
 * data flow as Diet Home's hero card (plan.md Decision #9) without showing a hint line the design
 * doesn't have. The existing Diet Home call site passes no `hint` prop at all, so the default must
 * preserve its current text exactly — this is the regression this file guards against.
 */

import { render, screen } from '@testing-library/react-native';

import { MacroSummaryCard } from '@/features/nutrition/components/MacroSummaryCard';

const TARGETS = { calories: 2000, protein_g: 150, carbs_g: 220, fat_g: 60 };
const CONSUMED = { calories_in: 800, protein_g: 60, carbs_g: 90, fat_g: 20 };

describe('nutrition: MacroSummaryCard hint prop (issue #31)', () => {
  it('shows the existing default hint when no hint prop is passed (Diet Home unaffected)', () => {
    render(<MacroSummaryCard targets={TARGETS} consumed={CONSUMED} />);
    expect(screen.getByText('Adjusts as I learn you')).toBeTruthy();
  });

  it('omits the hint row entirely when hint is explicitly null (design 28c)', () => {
    render(<MacroSummaryCard targets={TARGETS} consumed={CONSUMED} hint={null} />);
    expect(screen.queryByText('Adjusts as I learn you')).toBeNull();
  });

  it('shows custom hint text when one is provided', () => {
    render(<MacroSummaryCard targets={TARGETS} consumed={CONSUMED} hint="Custom hint" />);
    expect(screen.getByText('Custom hint')).toBeTruthy();
    expect(screen.queryByText('Adjusts as I learn you')).toBeNull();
  });

  it('still shows "Left today" and the remaining kcal regardless of hint', () => {
    render(<MacroSummaryCard targets={TARGETS} consumed={CONSUMED} hint={null} />);
    expect(screen.getByText('Left today')).toBeTruthy();
    expect(screen.getByText('1,200')).toBeTruthy();
  });
});
