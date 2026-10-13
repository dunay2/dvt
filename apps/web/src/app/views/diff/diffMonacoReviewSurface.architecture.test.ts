/** Owned concern: guard Diff route Monaco review semantics and documentation closure. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

describe('Diff Monaco review surface architecture', () => {
  it('keeps internal viewers under the current shared Monaco boundary', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/monaco/monaco-bundle-isolation-component.md'
    );

    for (const requiredSignal of [
      '## Public API',
      '## Invariants',
      '## Consumers',
      'Internal comparison',
      'MonacoDiffViewer',
      'Read-only comparison',
      'Consumer modules use lazy gateways',
    ]) {
      expect(componentGuide).toContain(requiredSignal);
    }
  });

  it('keeps Monaco as a lazy, read-only DiffEditor primitive instead of route or shell authority', () => {
    const diffView = readAppSource('views/DiffView.tsx');
    const diffTabs = readAppSource('views/diff/DiffTabs.tsx');
    const sqlPanel = readAppSource('views/diff/SqlDiffPanel.tsx');
    const catalogPanel = readAppSource('views/diff/CatalogDiffPanel.tsx');
    const monacoViewer = readAppSource('components/monaco/MonacoDiffViewer.tsx');
    const monacoSurface = readAppSource('components/monaco/MonacoDiffSurface.tsx');
    const monacoVisualTokens = readAppSource('components/monaco/monacoVisualTokens.ts');

    for (const [modulePath, source] of [
      ['views/DiffView.tsx', diffView],
      ['views/diff/DiffTabs.tsx', diffTabs],
      ['views/diff/SqlDiffPanel.tsx', sqlPanel],
      ['views/diff/CatalogDiffPanel.tsx', catalogPanel],
      ['components/monaco/MonacoDiffViewer.tsx', monacoViewer],
      ['components/monaco/MonacoDiffSurface.tsx', monacoSurface],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(diffView).toContain('RouteWorkbenchFrame');
    expect(diffView).not.toContain('MonacoDiffViewer');
    expect(diffView).not.toContain('@monaco-editor/react');

    expect(diffTabs).toContain('GraphDiffPanel');
    expect(diffTabs).toContain('SqlDiffPanel');
    expect(diffTabs).toContain('CatalogDiffPanel');
    expect(diffTabs).not.toContain('@monaco-editor/react');

    expect(sqlPanel).toContain('MonacoDiffViewer');
    expect(catalogPanel).toContain('MonacoDiffViewer');
    expect(monacoViewer).toContain("lazy(() => import('./MonacoDiffSurface'))");
    expect(monacoSurface).toContain('DiffEditor');
    expect(monacoSurface).toContain('createMonacoDiffOptions({ ariaLabel })');
    expect(monacoVisualTokens).toContain('readOnly: true');
    expect(monacoVisualTokens).toContain('originalEditable: false');
    expect(monacoVisualTokens).toContain('contextmenu: false');
    expect(monacoSurface).not.toContain('import { Editor }');
    expect(monacoSurface).not.toContain('<Editor');
    expect(monacoSurface).not.toContain('onChange');
    expect(monacoSurface).not.toContain('onMount');
    expect(monacoSurface).not.toContain('save');
  });
});
