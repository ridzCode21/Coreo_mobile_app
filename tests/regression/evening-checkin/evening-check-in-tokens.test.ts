/**
 * Issue #46 - the tomorrow-previewed card's grabber bar is `rgba(255,255,255,.25)` in design 24a.
 * A previous attempt reused `labelPreviewBorder` (.6), which failed design review.
 */

import { colors } from '@/shared/theme/tokens';

describe('evening check-in tokens', () => {
  it('has a dedicated grabber colour at the design value', () => {
    expect(colors.eveningCheckInGrabber).toBe('rgba(255,255,255,0.25)');
    expect(colors.eveningCheckInGrabber).not.toBe(colors.labelPreviewBorder);
  });
});
