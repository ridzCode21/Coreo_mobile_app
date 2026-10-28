/**
 * Issue #46 - evening check-in 24a owns its colours, sizes and glass recipes (design-spec.md
 * lines 60-135) instead of borrowing other features' tokens.
 */

import { colors, componentSizes, glass, spacing } from '@/shared/theme/tokens';

describe('evening check-in tokens', () => {
  it('has a dedicated grabber colour at the design value', () => {
    expect(colors.eveningCheckInGrabber).toBe('rgba(255,255,255,0.25)');
    expect(colors.eveningCheckInGrabber).not.toBe(colors.labelPreviewBorder);
  });

  it('uses the design colours for the dimmed eyebrow and the preview eyebrow', () => {
    expect(colors.eveningCheckInDimEyebrow).toBe('rgba(23,25,29,0.3)');
    expect(colors.eveningCheckInPreviewEyebrow).toBe('rgba(239,244,249,0.5)');
  });

  it('has the tomorrow card recipe: .9 to .95 night gradient, white .22 border', () => {
    expect(glass.eveningCheckInPreview.gradient).toEqual([
      'rgba(34,66,102,0.9)',
      'rgba(12,28,48,0.95)',
    ]);
    expect(glass.eveningCheckInPreview.border).toBe('rgba(255,255,255,0.22)');
    expect(componentSizes.eveningCheckInPreviewShadowOffset).toBe(30);
    expect(componentSizes.eveningCheckInPreviewShadowRadius).toBe(60);
    expect(componentSizes.eveningCheckInPreviewLiftOffset).toBe(-20);
    expect(componentSizes.eveningCheckInPreviewLiftRadius).toBe(50);
  });

  it('has the recap card recipe and the selected pill border at the design values', () => {
    expect(glass.eveningCheckInRecap.gradient).toEqual([
      'rgba(255,255,255,0.66)',
      'rgba(255,255,255,0.26)',
    ]);
    expect(glass.eveningCheckInRecap.border).toBe('rgba(255,255,255,0.6)');
    expect(glass.eveningCheckInMoodSelected.border).toBe('rgba(255,255,255,0.95)');
  });

  it('has the design spacing: 64 top, 32 bottom, 9 recap gap, 22/24/26 preview padding', () => {
    expect(spacing.screenPadTop).toBe(64);
    expect(spacing.eveningCheckInPadBottom).toBe(32);
    expect(spacing.eveningCheckInRecapGap).toBe(9);
    expect(spacing.eveningCheckInPreviewPadX).toBe(22);
    expect(spacing.eveningCheckInPreviewPadTop).toBe(24);
    expect(spacing.eveningCheckInPreviewPadBottom).toBe(26);
    expect(componentSizes.eveningCheckInFixUnderlineGap).toBe(3);
  });
});
