import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

/** Strips `//` line comments and `/* *\/` block comments so prose that mentions an example value
 * (existing docstrings do this a lot in this codebase) doesn't trip the literal scan below. Not a
 * full JS parser — good enough for this codebase's style (no `//`/`/*` inside string literals in
 * the files under test). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const HEX_OR_RGBA = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

// Issue #53 acceptance criterion: "A search for hex and `rgba(` literals in components finds only
// token files." Scoped to the files this issue's "Current behavior" section names — the rest of
// the app is out of scope (CLAUDE.md: keep the diff to this issue).
const FILES_MUST_BE_LITERAL_FREE = [
  'src/shared/components/GlassCard.tsx',
  'src/shared/components/SkyBackground.tsx',
  'src/shared/components/SelectableChip.tsx',
  'src/shared/components/ToggleRow.tsx',
  'src/shared/components/PetalCluster.tsx',
  'src/shared/components/VoiceInputBar.tsx',
  'src/features/home/screens/CoreoHomeScreen.tsx',
  'src/features/home/screens/PillarComingSoonScreen.tsx',
  'src/features/nutrition/screens/DietHomeScreen.tsx',
  'src/features/nutrition/screens/MealDetailScreen.tsx',
  'src/features/nutrition/screens/MealPlanScreen.tsx',
  'src/features/nutrition/screens/ConfirmMealScreen.tsx',
  'src/features/nutrition/screens/BarcodeScannerScreen.tsx',
  'src/features/nutrition/components/BarcodeScannerView.tsx',
  'src/features/nutrition/components/MealPlanCard.tsx',
  'src/features/onboarding/components/OnboardingStepScaffold.tsx',
  'src/features/onboarding/components/NextBar.tsx',
  'src/features/onboarding/screens/FirstOpenScreen.tsx',
  'src/features/onboarding/screens/SaveScreen.tsx',
  'src/features/splash/screens/SplashScreen.tsx',
];

describe('foundation: no hand-rolled hex/rgba colour literals outside token files (issue #53)', () => {
  it.each(FILES_MUST_BE_LITERAL_FREE)('%s has no raw hex or rgba() colour literal', (relPath) => {
    const stripped = stripComments(read(relPath));
    const offendingLines = stripped
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => HEX_OR_RGBA.test(line));
    expect(offendingLines).toEqual([]);
  });
});

describe('foundation: nine screens use the shared SkyBackground (issue #53)', () => {
  const SKY_SCREENS = [
    'src/features/home/screens/CoreoHomeScreen.tsx',
    'src/features/home/screens/PillarComingSoonScreen.tsx',
    'src/features/nutrition/screens/DietHomeScreen.tsx',
    'src/features/nutrition/screens/MealDetailScreen.tsx',
    'src/features/nutrition/screens/MealPlanScreen.tsx',
    'src/features/nutrition/screens/ConfirmMealScreen.tsx',
    'src/features/onboarding/components/OnboardingStepScaffold.tsx',
    'src/features/onboarding/screens/FirstOpenScreen.tsx',
    'src/features/splash/screens/SplashScreen.tsx',
  ];

  it.each(SKY_SCREENS)('%s imports SkyBackground', (relPath) => {
    const src = read(relPath);
    expect(src).toMatch(
      /import\s*\{\s*SkyBackground\s*\}\s*from\s*'@\/shared\/components\/SkyBackground'/,
    );
  });

  it.each(SKY_SCREENS)('%s renders <SkyBackground', (relPath) => {
    const src = read(relPath);
    expect(src).toMatch(/<SkyBackground[\s>]/);
  });

  it.each(SKY_SCREENS)(
    '%s no longer builds the raw sky gradient colour array inline',
    (relPath) => {
      const src = read(relPath);
      expect(src).not.toMatch(/colors\.zenith\s*,\s*colors\.day\s*,\s*colors\.air/);
      expect(src).not.toMatch(/colors\.day\s*,\s*colors\.air\s*,\s*colors\.sky/);
    },
  );
});

describe('foundation: raw sizes cited by the issue move to tokens (issue #53)', () => {
  it('MealPlanScreen back arrow uses Poppins, not a bare fontSize/lineHeight pair', () => {
    const src = read('src/features/nutrition/screens/MealPlanScreen.tsx');
    const match = src.match(/backText:\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).not.toMatch(/fontSize:\s*28/);
    expect(body).toMatch(/textStyle\(|fontFamily/);
  });

  it('NextBar label no longer hardcodes fontSize 13.5', () => {
    const src = read('src/features/onboarding/components/NextBar.tsx');
    expect(src).not.toMatch(/fontSize:\s*13\.5/);
  });

  it('SaveScreen button/privacy text no longer hardcodes fontSize 14 or 10.5', () => {
    const src = read('src/features/onboarding/screens/SaveScreen.tsx');
    expect(src).not.toMatch(/fontSize:\s*14\b/);
    expect(src).not.toMatch(/fontSize:\s*10\.5/);
  });

  it('BarcodeScannerScreen no longer hardcodes letterSpacing: 1, uses the tracking token instead', () => {
    const src = read('src/features/nutrition/screens/BarcodeScannerScreen.tsx');
    expect(src).not.toMatch(/letterSpacing:\s*1\b/);
    expect(src).toMatch(/tracking\.wide/);
  });
});
