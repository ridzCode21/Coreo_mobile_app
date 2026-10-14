import {
  colors,
  componentSizes,
  glass,
  radii,
  sheetSkyGradient,
  skyGradient,
  spacing,
  textStyle,
  tracking,
  typography,
  withAlpha,
} from '@/shared/theme/tokens';

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

  // Issue #52 — align theme tokens with the Claude Design (`Coreo App Screens.dc.html`).
  // These assertions preserve the design-backed values used by the app theme.

  describe('ink alpha steps', () => {
    it('keeps the two alpha steps that already matched the design', () => {
      expect(colors.ink40).toBe('rgba(23,25,29,0.42)');
      expect(colors.ink45).toBe('rgba(23,25,29,0.45)');
    });

    it("adds the design's missing alpha steps (.5, .55, .6 and .75)", () => {
      expect(colors.ink50).toBe('rgba(23,25,29,0.5)');
      expect(colors.ink55).toBe('rgba(23,25,29,0.55)');
      expect(colors.ink60).toBe('rgba(23,25,29,0.6)');
      expect(colors.ink75).toBe('rgba(23,25,29,0.75)');
    });

    it('renames the old .62-valued token to ink62, freeing ink60 for the real .6 value', () => {
      // The old `ink60` was actually rgba(...,0.62) — a misleading name. It's renamed to
      // `ink62` (same value, same rendered colour) so `ink60` can mean what it says.
      expect(colors.ink62).toBe('rgba(23,25,29,0.62)');
      expect(colors.ink60).not.toBe(colors.ink62);
    });
  });

  it("matches the design's onNight text colour (#F0F4F8), not the old near-miss (#EFF4F9)", () => {
    expect(colors.onNight).toBe('#F0F4F8');
  });

  it('matches the design\'s "Verified" status-tint green for success (#3E8E63)', () => {
    expect(colors.success).toBe('#3E8E63');
  });

  it('keeps attention unchanged pending an owner decision (no caution tint exists in the design or brand book — see blocked.txt)', () => {
    expect(colors.attention).toBe('#7A5220');
  });

  describe('sky gradients', () => {
    it("defines the primary sky gradient with the design's exact 168deg stops", () => {
      expect(skyGradient.colors).toEqual(['#D3E6F8', '#9EC3E8', '#6F9CCE']);
      expect(skyGradient.locations).toEqual([0, 0.48, 1]);
    });

    it('defines the second "sheet" sky gradient with the design\'s exact 168deg stops', () => {
      expect(sheetSkyGradient.colors).toEqual(['#A3C4E5', '#7299C6', '#54779F']);
      expect(sheetSkyGradient.locations).toEqual([0, 0.52, 1]);
    });
  });

  describe('spacing', () => {
    it("adds the design's 10px and 14px gaps", () => {
      expect(spacing.ms).toBe(10);
      expect(spacing.ml).toBe(14);
    });

    it("settles screenPadTop on the design's default 64px value", () => {
      expect(spacing.screenPadTop).toBe(64);
    });
  });

  it('adds the missing 12px, 22px and 36px radii', () => {
    expect(radii.xs).toBe(12);
    expect(radii.ml).toBe(22);
    expect(radii.xxl).toBe(36);
  });

  describe('typography', () => {
    it('adds line heights the design specifies for questionTitle (1.4) and greeting (1.35)', () => {
      expect(typography.questionTitle.lineHeight).toBe(1.4);
      expect(typography.greeting.lineHeight).toBe(1.35);
    });

    it("fixes sheetTitle to the design's letter spacing (-0.5) and adds its line height (1.4)", () => {
      expect(typography.sheetTitle.letterSpacing).toBe(-0.5);
      expect(typography.sheetTitle.lineHeight).toBe(1.4);
    });

    it("fixes micro letter spacing to the design's value (1.4)", () => {
      expect(typography.micro.letterSpacing).toBe(1.4);
    });

    it("fixes body line height to the design's dominant value (1.8)", () => {
      expect(typography.body.lineHeight).toBe(1.8);
    });

    it("fixes caption font size to the design's 11px value", () => {
      expect(typography.caption.fontSize).toBe(11);
    });

    it('adds the missing card-title style (19/300/-0.3, e.g. "Password reset")', () => {
      expect(typography.cardTitle).toMatchObject({
        fontSize: 19,
        fontWeight: '300',
        letterSpacing: -0.3,
      });
    });

    it('adds the missing button text styles (14/500 primary CTA, 13.5/500 compact)', () => {
      expect(typography.button).toMatchObject({ fontSize: 14, fontWeight: '500' });
      expect(typography.buttonSm).toMatchObject({ fontSize: 13.5, fontWeight: '500' });
    });

    it('adds the missing 12/300 small-text style (line height 1.6)', () => {
      expect(typography.small).toMatchObject({
        fontSize: 12,
        fontWeight: '300',
        lineHeight: 1.6,
      });
    });

    it('textStyle() resolves the new tokens to real fonts and absolute line heights', () => {
      expect(textStyle('button').fontSize).toBe(14);
      expect(textStyle('small').lineHeight).toBe(12 * 1.6);
      expect(textStyle('cardTitle').fontSize).toBe(19);
    });

    it("adds the legal/fine-print style for Save's privacy note (10.5/300)", () => {
      expect(typography.legal).toMatchObject({ fontSize: 10.5, fontWeight: '300' });
    });
  });

  // Issue #53 — shared sky background, glass cards and raw values. GlassCard's four recipes
  // (light, night, chip, sheet) move into one token export so no screen/component can drift from
  // the design's measured values again; `withAlpha` lets components reuse a named base colour at
  // a one-off opacity without hardcoding a new hex/rgba literal.

  describe('glass recipes', () => {
    it("fixes light glass to the design's exact border (.55) and shadow (.14) — gradient was already correct", () => {
      expect(glass.light.gradient).toEqual(['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.2)']);
      expect(glass.light.border).toBe('rgba(255,255,255,0.55)');
      expect(glass.light.shadowColor).toBe('rgba(18,42,70,0.14)');
    });

    it("fixes night glass to the design's dominant gradient (.6 to .7) and border (.22)", () => {
      expect(glass.night.gradient).toEqual(['rgba(34,66,102,0.6)', 'rgba(12,28,48,0.7)']);
      expect(glass.night.border).toBe('rgba(255,255,255,0.22)');
    });

    it("adds the chip glass recipe (.5 to .14, border .55) used by SelectableChip/ToggleRow's unselected state", () => {
      expect(glass.chip.gradient).toEqual(['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.14)']);
      expect(glass.chip.border).toBe('rgba(255,255,255,0.55)');
    });

    it('adds the selected-chip/row glass recipe (.94 to .6, border .9) already used by ToggleRow', () => {
      expect(glass.chipSelected.gradient).toEqual([
        'rgba(255,255,255,0.94)',
        'rgba(255,255,255,0.6)',
      ]);
      expect(glass.chipSelected.border).toBe('rgba(255,255,255,0.9)');
    });

    it("preserves SelectableChip's distinct selected-state shadow (.18)", () => {
      expect(glass.selectableChipSelected.shadowColor).toBe('rgba(18,42,70,0.18)');
    });

    it('adds the sheet glass recipe (160deg .82 to .55, border .85, radius 36)', () => {
      expect(glass.sheet.gradient).toEqual(['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.55)']);
      expect(glass.sheet.border).toBe('rgba(255,255,255,0.85)');
      expect(radii.xxl).toBe(36);
    });
  });

  describe('withAlpha and new base colours', () => {
    it('blends a hex colour to an rgba string at the given alpha', () => {
      expect(withAlpha(colors.white, 0.5)).toBe('rgba(255,255,255,0.5)');
      expect(withAlpha(colors.ink, 0.8)).toBe('rgba(23,25,29,0.8)');
    });

    it("adds the Brand Book 'Fog' colour (#EFF4F8) used for faded text on night/dark glass", () => {
      expect(colors.fog).toBe('#EFF4F8');
    });

    it('adds the overlayInk base (#122A46) used by card shadows and translucent dark overlays', () => {
      expect(colors.overlayInk).toBe('#122A46');
      expect(withAlpha(colors.overlayInk, 0.35)).toBe('rgba(18,42,70,0.35)');
    });
  });

  it('adds a wide letter-spacing token for scanner/manual-entry text (barcode screen)', () => {
    expect(tracking.wide).toBe(1);
  });

  // Issue #14 — Create account (8e) / Sign in (8b) design tokens.
  describe('auth screen tokens (issue #14)', () => {
    it('adds the 54px solid-ink button height shared by 8e "Create account" and 8b "Sign in"', () => {
      expect(componentSizes.authButtonHeight).toBe(54);
    });

    it('adds the 15/18px labelled glass-field padding used by LabeledField', () => {
      expect(spacing.fieldPadY).toBe(15);
      expect(spacing.fieldPadX).toBe(18);
    });
  });

  // Issue #17 — home header row (design-spec.md 24b/10a).
  describe('home header tokens (issue #17)', () => {
    it('adds the 7px gap between the wave mark and the "coreo" wordmark in the home header', () => {
      expect(spacing.headerLogoGap).toBe(7);
    });

    it('adds the 10px/400/1.6-letter-spacing uppercase date style ("Mon · Jul 7")', () => {
      expect(typography.headerDate).toEqual({
        fontSize: 10,
        fontWeight: '400',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      });
      expect(textStyle('headerDate').textTransform).toBe('uppercase');
    });

    it('adds the 13.5px/300 greeting subtitle style ("You\'re running ahead of yesterday." slot)', () => {
      expect(typography.greetingSubtitle).toEqual({
        fontSize: 13.5,
        fontWeight: '300',
        letterSpacing: 0,
      });
    });
  });
});
