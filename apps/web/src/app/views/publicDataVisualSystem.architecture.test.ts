import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8').replace(/\s+/gu, ' ');
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

describe('public data visual system architecture', () => {
  const operatorBoundary =
    /\bmust\s+not\s+be\s+applied\s+to\s+operator\s+(?:workbench\s+routes|surfaces)\b/u;

  it.each([
    'Marquez must not be applied to operator workbench routes.',
    'It must not be applied to operator surfaces such as Canvas.',
    'It must not be applied to operator\nworkbench\nroutes such as Canvas.',
  ])('accepts equivalent operator-boundary prose: %s', (prose) => {
    expect(prose).toMatch(operatorBoundary);
  });

  it.each([
    'Marquez is a public-data visual system.',
    'It must be applied to operator surfaces.',
    'It may be applied to operator workbench routes.',
    'It must not be applied to public-data surfaces.',
  ])('rejects missing or reversed operator boundaries: %s', (prose) => {
    expect(prose).not.toMatch(operatorBoundary);
  });

  it('documents Marquez as a scoped public-data visual system', () => {
    const componentPath =
      'docs/architecture/components/web/public-data/marquez-visual-system-component.md';
    const storiesPath =
      'docs/architecture/components/web/public-data/marquez-visual-system-user-stories.md';

    expect(repoFileExists(componentPath)).toBe(true);
    expect(repoFileExists(storiesPath)).toBe(true);

    const componentDoc = readRepoFile(componentPath);
    const storiesDoc = readRepoFile(storiesPath);

    expect(componentDoc).toContain('## Public API');
    expect(componentDoc).toContain('## Invariants');
    expect(componentDoc).toContain('## Transitions');
    expect(componentDoc).toContain('## Consumers');
    expect(componentDoc).toContain('marquezVisualTokens');
    expect(componentDoc).toContain('MarquezPublicDataSurface');
    expect(componentDoc).toContain('operator workbench routes must not import');
    expect(storiesDoc).toContain('US-MARQUEZ-001');
    expect(storiesDoc).toContain('US-MARQUEZ-004');
  });

  it('keeps Marquez separated from operator workbench guidance', () => {
    const uxGuide = readRepoFile('docs/architecture/components/web/ux-implementation-guide.md');
    const referenceStack = readRepoFile(
      'docs/architecture/components/web/library-and-open-source-reference-stack.md'
    );
    const webIndex = readRepoFile('docs/architecture/components/web/index.md');

    expect(uxGuide).toContain('Marquez visual system');
    expect(uxGuide).toContain('public-data surfaces');
    expect(uxGuide).toMatch(operatorBoundary);
    expect(referenceStack).toContain('Marquez visual system');
    expect(referenceStack).toContain('not a dependency');
    expect(webIndex).toContain('Marquez public-data visual system');
  });
});
