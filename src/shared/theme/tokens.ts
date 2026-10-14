/**
 * Design tokens — mirrors docs/design-system.md. Values are the real Coreo system (not
 * placeholders): colors §1, typography §2, spacing/radius §3. If a screen needs a value that
 * isn't here, add it to docs/design-system.md first, then here — don't hardcode a one-off.
 */

export const colors = {
  ink: '#17191D',
  ink40: 'rgba(23,25,29,0.42)',
  ink45: 'rgba(23,25,29,0.45)',
  ink50: 'rgba(23,25,29,0.5)',
  ink55: 'rgba(23,25,29,0.55)',
  ink60: 'rgba(23,25,29,0.6)',
  ink62: 'rgba(23,25,29,0.62)',
  ink70: 'rgba(23,25,29,0.7)',
  ink75: 'rgba(23,25,29,0.75)',
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
  nightShadow: 'rgba(8,24,44,0.3)',

  coreBlue: '#35689E',
  coreBlueDeep: '#16395E',

  white: '#FFFFFF',
  onNight: '#F0F4F8',
  fog: '#EFF4F8',
  overlayInk: '#122A46',

  success: '#3E8E63',
  attention: '#7A5220',
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

export const skyGradient = {
  colors: [colors.day, colors.air, '#6F9CCE'],
  locations: [0, 0.48, 1],
} as const;

export const sheetSkyGradient = {
  colors: ['#A3C4E5', '#7299C6', '#54779F'],
  locations: [0, 0.52, 1],
} as const;

export const glass = {
  light: {
    gradient: [withAlpha(colors.white, 0.62), withAlpha(colors.white, 0.2)],
    border: withAlpha(colors.white, 0.55),
    shadowColor: withAlpha(colors.overlayInk, 0.14),
    topHighlight: withAlpha(colors.white, 0.65),
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  night: {
    gradient: ['rgba(34,66,102,0.6)', 'rgba(12,28,48,0.7)'],
    border: withAlpha(colors.white, 0.22),
    shadowColor: 'rgba(8,24,44,0.34)',
    topHighlight: withAlpha(colors.white, 0.22),
    start: { x: 0.21, y: 0 },
    end: { x: 0.79, y: 1 },
  },
  chip: {
    gradient: [withAlpha(colors.white, 0.5), withAlpha(colors.white, 0.14)],
    border: withAlpha(colors.white, 0.55),
    shadowColor: withAlpha(colors.overlayInk, 0.14),
    topHighlight: withAlpha(colors.white, 0.5),
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  chipSelected: {
    gradient: [withAlpha(colors.white, 0.94), withAlpha(colors.white, 0.6)],
    border: withAlpha(colors.white, 0.9),
    shadowColor: withAlpha(colors.overlayInk, 0.2),
    topHighlight: withAlpha(colors.white, 0.75),
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  selectableChipSelected: {
    shadowColor: withAlpha(colors.overlayInk, 0.18),
  },
  sheet: {
    gradient: [withAlpha(colors.white, 0.82), withAlpha(colors.white, 0.55)],
    border: withAlpha(colors.white, 0.85),
    shadowColor: withAlpha(colors.overlayInk, 0.14),
    topHighlight: withAlpha(colors.white, 0.65),
    start: { x: 0.32, y: 0 },
    end: { x: 0.68, y: 1 },
  },
} as const;

export const tracking = {
  wide: 1,
} as const;

export const spacing = {
  xs: 4,
  sliderCaptionGap: 6,
  sm: 8,
  ms: 10,
  md: 12,
  ml: 14,
  lg: 16,
  sheetTitleGap: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  portionReadoutGap: 22,
  screenPadX: 26,
  screenPadXCompact: 22,
  screenPadTop: 64,
  screenPadBottom: 36,
  sheetSubtitleGap: 2,
  replaceDetailGap: 3,
} as const;

export const radii = {
  xs: 12,
  sm: 15,
  control: 18,
  md: 20,
  ml: 22,
  lg: 23,
  xl: 28,
  quotaCard: 32,
  xxl: 36,
  pill: 9999,
  petalOuter: 125,
  petalInner: 30,
} as const;

export const componentSizes = {
  minimumTapTarget: 44,
  sheetGrabberWidth: 40,
  sheetGrabberHeight: 5,
  sheetChipHeight: 42,
  sheetNoteHeight: 48,
  sheetControlHeight: 52,
  sheetVoiceButton: 38,
  sheetVoiceIcon: 14,
  replaceOptionRadio: 18,
  replaceCompareActionHeight: 38,
  replaceConfirmActionHeight: 54,
  replaceBackIcon: 15,
  rebuildingStepIndicator: 20,
  rebuildingStepBorderWidth: 1.5,
  portionSliderThumbSize: 32,
  portionSliderTrackHeight: 4,
  portionSliderShadowRadius: 18,
  portionSliderElevation: 4,
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
  questionTitle: { fontSize: 30, fontWeight: '200', letterSpacing: -0.5, lineHeight: 1.4 },
  greeting: { fontSize: 28, fontWeight: '200', letterSpacing: -0.5, lineHeight: 1.35 },
  cardValue: { fontSize: 22, fontWeight: '300', letterSpacing: 0 },
  portionReadout: { fontSize: 44, fontWeight: '200', letterSpacing: -1 },
  cardTitle: { fontSize: 19, fontWeight: '300', letterSpacing: -0.3 },
  sheetSubtitle: { fontSize: 11.5, fontWeight: '300', letterSpacing: 0 },
  sheetTitle: { fontSize: 25, fontWeight: '200', letterSpacing: -0.5, lineHeight: 1.4 },
  bodyLg: { fontSize: 15, fontWeight: '300', letterSpacing: 0, lineHeight: 1.75 },
  quotaMessage: { fontSize: 16, fontWeight: '300', letterSpacing: 0, lineHeight: 1.7 },
  button: { fontSize: 14, fontWeight: '500', letterSpacing: 0 },
  buttonSm: { fontSize: 13.5, fontWeight: '500', letterSpacing: 0 },
  body: { fontSize: 13, fontWeight: '300', letterSpacing: 0, lineHeight: 1.8 },
  portionEstimate: { fontSize: 13, fontWeight: '400', letterSpacing: 0 },
  bodySm: { fontSize: 12.5, fontWeight: '300', letterSpacing: 0, lineHeight: 1.6 },
  small: { fontSize: 12, fontWeight: '300', letterSpacing: 0, lineHeight: 1.6 },
  caption: { fontSize: 11, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 10, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },
  micro: { fontSize: 9, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase' },
  legal: { fontSize: 10.5, fontWeight: '300', letterSpacing: 0 },
  replaceOption: { fontSize: 13, fontWeight: '400', letterSpacing: 0 },
  replaceOptionSelected: { fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  replaceCompareTitle: { fontSize: 14, fontWeight: '500', letterSpacing: 0 },
  replaceConfirmMeal: { fontSize: 15, fontWeight: '500', letterSpacing: 0 },
  replaceReceiptTitle: { fontSize: 16, fontWeight: '500', letterSpacing: 0 },
  replaceReceiptMacros: { fontSize: 11, fontWeight: '300', letterSpacing: 0 },
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
