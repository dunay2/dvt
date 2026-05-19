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
  it('documents the component API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/diff/diff-monaco-review-surface-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/diff/diff-monaco-review-surface-user-stories.md'
    );
    const mailboxAnalysis = readRepoDoc(
      'buzon/20260519-f17b-fowler-monaco-diff-review-surface-analysis.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17b-monaco-diff-review-surface-plan-20260519.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'MonacoDiffViewer',
      'MonacoDiffSurface',
      'SqlDiffPanel',
      'CatalogDiffPanel',
      'DiffReviewSurfaceReadModel',
      'read-only',
      'diff-only',
      'GetWorkspaceDiffChanges',
      'GetWorkspaceFileContent',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-F17B-001',
      'US-F17B-002',
      'US-F17B-003',
      'US-F17B-004',
      'US-F17B-005',
      '## Scenario Matrix',
      'read-only',
      'diff-only',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredAnalysisSection of [
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions',
      '## Code And Documentation Drift',
      '## Opportunities',
      '## ADR Decision',
      'Semantic Fitness Function',
    ]) {
      expect(mailboxAnalysis).toContain(requiredAnalysisSection);
    }

    expect(implementationPlan).toContain('featureId: F17B-MONACO-DIFF-REVIEW-SURFACE-20260519');
    expect(implementationPlan).toContain('diffMonacoReviewSurface.architecture.test.ts');
  });

  it('keeps Monaco as a lazy, read-only DiffEditor primitive instead of route or shell authority', () => {
    const diffView = readAppSource('views/DiffView.tsx');
    const diffTabs = readAppSource('views/diff/DiffTabs.tsx');
    const sqlPanel = readAppSource('views/diff/SqlDiffPanel.tsx');
    const catalogPanel = readAppSource('views/diff/CatalogDiffPanel.tsx');
    const monacoViewer = readAppSource('components/monaco/MonacoDiffViewer.tsx');
    const monacoSurface = readAppSource('components/monaco/MonacoDiffSurface.tsx');

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
    expect(monacoSurface).toContain('readOnly: true');
    expect(monacoSurface).toContain('originalEditable: false');
    expect(monacoSurface).toContain('contextmenu: false');
    expect(monacoSurface).not.toContain('import { Editor }');
    expect(monacoSurface).not.toContain('<Editor');
    expect(monacoSurface).not.toContain('onChange');
    expect(monacoSurface).not.toContain('onMount');
    expect(monacoSurface).not.toContain('save');
  });
});
