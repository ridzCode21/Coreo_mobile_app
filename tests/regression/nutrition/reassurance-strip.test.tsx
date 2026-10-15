/**
 * Issue #22 — the calm reassurance strip on Diet home (design-spec.md line 19, markup lines 87-89):
 * always-visible, static, never red. Previously missing entirely.
 */

import { render, screen } from '@testing-library/react-native';

import { ReassuranceStrip } from '@/features/nutrition/components/ReassuranceStrip';

describe('nutrition: ReassuranceStrip (issue #22)', () => {
  it('shows the exact design copy', () => {
    render(<ReassuranceStrip />);
    expect(
      screen.getByText('Went over yesterday? Nothing turns red here. I adjust, we move on.'),
    ).toBeTruthy();
  });
});
