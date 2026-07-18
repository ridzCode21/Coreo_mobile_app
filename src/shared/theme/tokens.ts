/**
 * Design tokens — mirrors docs/design-system.md. Values are the real Coreo system (not
 * placeholders): colors §1, typography §2, spacing/radius §3. If a screen needs a value that
 * isn't here, add it to docs/design-system.md first, then here — don't hardcode a one-off.
 */

export const colors = {
  ink: '#17191D',
  ink60: 'rgba(23,25,29,0.62)',
  ink40: 'rgba(23,25,29,0.42)',
  ink45: 'rgba(23,25,29,0.45)',
  label: '#5F6B76',

  zenith: '#EDF4FB',
  day: '#D3E6F8',
  air: '#9EC3E8',
  sky: '#7FA0C6',
  dusk: '#5D80A9',
  horizon: '#466687',

  evening: '#48678C',
  night: '#2E4666',
  midnight: '#152741',

  coreBlue: '#35689E',
  coreBlueDeep: '#16395E',

  white: '#FFFFFF',
  onNight: '#EFF4F9',

  success: '#2F5D3A',
  attention: '#7A5220',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadX: 26,
  screenPadXCompact: 22,
  screenPadTop: 70,
  screenPadBottom: 36,
} as const;

export const radii = {
  sm: 15,
  md: 20,
  lg: 23,
  xl: 28,
  pill: 9999,
  petalOuter: 125,
  petalInner: 30,
} as const;

export const fontFamily = {
  poppins200: 'Poppins_200ExtraLight',
  poppins300: 'Poppins_300Light',
  poppins400: 'Poppins_400Regular',
  poppins500: 'Poppins_500Medium',
} as const;

type PoppinsWeight = '200' | '300' | '400' | '500';

type TypographySpec = {
  fontSize: number;
  fontWeight: PoppinsWeight;
  letterSpacing: number;
  /** Line-height *multiplier* (matches how design-system.md §2 specifies it, e.g. 1.75) — RN's
   * `lineHeight` style wants absolute px, so `textStyle()` below converts fontSize × this. */
  lineHeight?: number;
  textTransform?: 'uppercase';
};

/**
 * Typography — Poppins only, weights 200/300/400/500. Never use a weight above 500 (see
 * docs/design-system.md §2 and §10 "Don't").
 */
export const typography = {
  display: { fontSize: 78, fontWeight: '200', letterSpacing: -2.5 },
  heroMarketing: { fontSize: 52, fontWeight: '200', letterSpacing: -1.5 },
  wordmark: { fontSize: 38, fontWeight: '300', letterSpacing: 6 },
  pageTitle: { fontSize: 34, fontWeight: '200', letterSpacing: -1 },
  questionTitle: { fontSize: 30, fontWeight: '200', letterSpacing: -0.5 },
  greeting: { fontSize: 28, fontWeight: '200', letterSpacing: -0.5 },
  cardValue: { fontSize: 22, fontWeight: '300', letterSpacing: 0 },
  sheetTitle: { fontSize: 25, fontWeight: '200', letterSpacing: -0.4 },
  bodyLg: { fontSize: 15, fontWeight: '300', letterSpacing: 0, lineHeight: 1.75 },
  body: { fontSize: 13, fontWeight: '300', letterSpacing: 0, lineHeight: 1.85 },
  bodySm: { fontSize: 12.5, fontWeight: '300', letterSpacing: 0, lineHeight: 1.6 },
  caption: { fontSize: 11.5, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 10, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },
  micro: { fontSize: 9, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' },
} as const satisfies Record<string, TypographySpec>;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type TypographyToken = keyof typeof typography;

const fontFamilyByWeight: Record<PoppinsWeight, string> = {
  '200': fontFamily.poppins200,
  '300': fontFamily.poppins300,
  '400': fontFamily.poppins400,
  '500': fontFamily.poppins500,
};

/**
 * Turns a typography token into a ready-to-spread RN text style: resolves the correct loaded
 * Poppins font file for the weight (RN ignores `fontWeight` once a specific-weight custom font
 * is set, so we set `fontFamily` instead of `fontWeight`) and converts the line-height multiplier
 * to absolute px. Use this instead of pulling `fontSize`/`fontWeight` off `typography` by hand.
 */
export function textStyle(token: TypographyToken) {
  const spec: TypographySpec = typography[token];
  return {
    fontFamily: fontFamilyByWeight[spec.fontWeight],
    fontSize: spec.fontSize,
    letterSpacing: spec.letterSpacing,
    ...(spec.lineHeight ? { lineHeight: spec.fontSize * spec.lineHeight } : {}),
    ...(spec.textTransform ? { textTransform: spec.textTransform } : {}),
  };
}
