import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// Issue #126 — issue #52 aligned the theme tokens but, by design, did not restyle screens. These
// four files were still painting their one primary button with the legacy `coreBlue` gradient/fill
// instead of the design's solid `ink` (#17191D) (docs/design-system.md §1 law 4: "Primary buttons
// are solid ink"). `FirstOpenScreen` is the one design-sanctioned exception (§1: "coreBlue is
// reserved for the single blue circle on the first-open design") and must keep using it.
const MIGRATED_FILES = [
  'src/features/nutrition/screens/ConfirmMealScreen.tsx',
  'src/features/nutrition/screens/BarcodeScannerScreen.tsx',
  'src/features/nutrition/components/BarcodeScannerView.tsx',
  'src/features/nutrition/components/DietPersonalizationCard.tsx',
];

const FIRST_OPEN_SCREEN = 'src/features/onboarding/screens/FirstOpenScreen.tsx';
const TOKENS_FILE = 'src/shared/theme/tokens.ts';

describe('foundation: legacy coreBlue primary buttons migrated to solid ink (issue #126)', () => {
  it.each(MIGRATED_FILES)('%s no longer references coreBlue', (relPath) => {
    const source = read(relPath);
    expect(source).not.toMatch(/colors\.coreBlue\b/);
  });

  it('FirstOpenScreen keeps the one design-sanctioned coreBlue usage (the first-open blue circle)', () => {
    const source = read(FIRST_OPEN_SCREEN);
    expect(source).toMatch(/colors\.coreBlue\b/);
  });

  it('coreBlue/coreBlueDeep tokens stay defined because FirstOpenScreen still uses them', () => {
    const tokens = read(TOKENS_FILE);
    expect(tokens).toMatch(/coreBlue:\s*'#35689E'/);
    expect(tokens).toMatch(/coreBlueDeep:\s*'#16395E'/);
  });

  it('coreBlue is referenced nowhere in src/ except tokens.ts and FirstOpenScreen', () => {
    // Guards both directions of acceptance criterion 3 ("remove coreBlue from the tokens if
    // nothing uses it afterwards"): catches a missed migration today, and if a future change ever
    // removes FirstOpenScreen's own usage, this starts failing as a reminder to delete the
    // now-unused token too, instead of leaving it to rot silently.
    const SRC_ROOT = path.join(ROOT, 'src');
    const allowed = new Set([TOKENS_FILE, FIRST_OPEN_SCREEN]);
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        if (allowed.has(rel)) continue;
        if (/coreBlue/.test(fs.readFileSync(full, 'utf8'))) offenders.push(rel);
      }
    };
    walk(SRC_ROOT);

    expect(offenders).toEqual([]);
  });
});
