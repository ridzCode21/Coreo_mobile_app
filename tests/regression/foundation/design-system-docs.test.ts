type FileSystem = {
  readFileSync(path: string, encoding: 'utf8'): string;
};

const { readFileSync } = jest.requireActual<FileSystem>('fs');
const designSystem = readFileSync(`${process.cwd()}/docs/design-system.md`, 'utf8');

describe('foundation: design-system documentation', () => {
  it('distinguishes the current solid-ink button rule from legacy blue CTA debt', () => {
    expect(designSystem).not.toContain('The one `coreBlue` primary action per screen');
    expect(designSystem).toMatch(
      /Existing `coreBlue` primary actions are legacy implementation debt\s+pending a separate\s+screen-migration issue\./,
    );
  });

  it('describes ink62 by its intended role', () => {
    expect(designSystem).toMatch(
      /\| `ink62`\s+\| `rgba\(23,25,29,\.62\)`\s+\| Secondary text at the pre-existing \.62 strength/,
    );
  });
});
