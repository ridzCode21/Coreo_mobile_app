/**
 * Issue #22 — `MacroSummaryCard` ("Left today") loses its quality badge
 * ("Starter"/"Estimated"/"Confirmed"/"Unavailable", current behaviour `MacroSummaryCard.tsx:66-68`)
 * for the design's fixed "Adjusts as I learn you" hint (design-spec.md line 16), the kcal number
 * moves from the 78px `display` token to the 38px `kcalHero` token (design-spec.md line 17-18,
 * `:124-126` pre-fix), and the macro bars fill solid white with a glow instead of
 * `rgba(255,255,255,.6)` with no glow (design-spec.md lines 69-79, `:25` pre-fix). The `quality`
 * prop is removed entirely — it has no other caller.
 */

import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MacroSummaryCard } from '@/features/nutrition/components/MacroSummaryCard';
import { colors, typography } from '@/shared/theme/tokens';
import type { MacroTargets } from '@/features/nutrition/lib/macros';
import type { MacroSummary } from '@/shared/types/food';

const targets: MacroTargets = { calories: 2000, protein_g: 120, carbs_g: 220, fat_g: 70 };
const consumed: MacroSummary = { calories_in: 760, protein_g: 62, carbs_g: 148, fat_g: 41 };

describe('nutrition: MacroSummaryCard (issue #22)', () => {
  it('shows "Left today" and the static "Adjusts as I learn you" hint, never a quality badge', () => {
    render(<MacroSummaryCard targets={targets} consumed={consumed} />);
    expect(screen.getByText('Left today')).toBeTruthy();
    expect(screen.getByText('Adjusts as I learn you')).toBeTruthy();
    for (const retired of ['Starter', 'Estimated', 'Confirmed', 'Unavailable']) {
      expect(screen.queryByText(retired)).toBeNull();
    }
  });

  it('renders the remaining-calories number at the kcalHero size (38px/200), not the old 78px display size', () => {
    render(<MacroSummaryCard targets={targets} consumed={consumed} />);
    const heroNumber = screen.getByText('1,240');
    const flattened = StyleSheet.flatten(heroNumber.props.style);
    expect(flattened.fontSize).toBe(typography.kcalHero.fontSize);
    expect(flattened.fontSize).not.toBe(typography.display.fontSize);
  });

  it('fills the macro bars solid white with a white glow shadow, on the existing translucent track', () => {
    render(<MacroSummaryCard targets={targets} consumed={consumed} />);
    // `testID="macro-fill-{protein_g|carbs_g|fat_g}"` on each bar's fill View — the only way to
    // assert a non-text visual style (glow) without walking implementation-detail DOM structure.
    const fill = screen.getByTestId('macro-fill-protein_g');
    const flattened = StyleSheet.flatten(fill.props.style);
    expect(flattened.backgroundColor).toBe(colors.white);
    expect(flattened.shadowColor).toBe(colors.white);
  });

  it("uses the Diet hero card's softer night gradient instead of the voice-bar night gradient", () => {
    render(<MacroSummaryCard targets={targets} consumed={consumed} />);
    const gradients = screen.UNSAFE_getAllByType(LinearGradient);
    expect(
      gradients.some(
        ({ props }) =>
          props.colors[0] === 'rgba(34,66,102,0.55)' && props.colors[1] === 'rgba(12,28,48,0.65)',
      ),
    ).toBe(true);
  });
});
