/** Owned concern: guard Artifacts route Monaco read-only viewer semantics and documentation closure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

function collectProductionSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectProductionSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(entry) || /\.test\./.test(entry)) {
      return [];
    }

    return [fullPath];
  });
}

describe('Artifacts Monaco read-only viewer architecture', () => {
  it('documents the component API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-user-stories.md'
    );
    const mailboxAnalysis = readRepoDoc(
      'buzon/20260520-f17c-fowler-artifacts-monaco-readonly-viewer-analysis.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17c-artifacts-monaco-readonly-viewer-plan-20260520.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'ArtifactPreviewTabs',
      'ArtifactMonacoPreviewPanel',
      'MonacoCodeViewer',
      'MonacoCodeSurface',
      'ArtifactsStructuredPayloadReadModel',
      'read-only',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-F17C-001',
      'US-F17C-002',
      'US-F17C-003',
      'US-F17C-004',
      'US-F17C-005',
      'US-F17C-006',
      '## Scenario Matrix',
      'read-only',
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

    expect(implementationPlan).toContain(
      'featureId: F17C-ARTIFACTS-MONACO-READONLY-VIEWER-20260520'
    );
    expect(implementationPlan).toContain('artifactsMonacoReadonlyViewer.architecture.test.ts');
  });

  it('keeps Monaco as a lazy read-only Artifacts panel primitive instead of route, shell, or Canvas authority', () => {
    const artifactsView = readAppSource('views/ArtifactsView.tsx');
    const artifactPreviewTabs = readAppSource('views/artifacts/ArtifactPreviewTabs.tsx');
    const artifactPreviewPanelPath = path.join(
      APP_ROOT,
      'views/artifacts/ArtifactMonacoPreviewPanel.tsx'
    );
    expect(existsSync(artifactPreviewPanelPath)).toBe(true);
    const artifactPreviewPanel = readFileSync(artifactPreviewPanelPath, 'utf8');
    const monacoViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const monacoSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');
    const monacoFallback = readAppSource('components/monaco/MonacoViewerFallback.tsx');
    const routeFrame = readAppSource('components/workbench/RouteWorkbenchFrame.tsx');

    for (const [modulePath, source] of [
      ['views/ArtifactsView.tsx', artifactsView],
      ['views/artifacts/ArtifactPreviewTabs.tsx', artifactPreviewTabs],
      ['views/artifacts/ArtifactMonacoPreviewPanel.tsx', artifactPreviewPanel],
      ['components/monaco/MonacoCodeViewer.tsx', monacoViewer],
      ['components/monaco/MonacoCodeSurface.tsx', monacoSurface],
      ['components/monaco/MonacoViewerFallback.tsx', monacoFallback],
      ['components/workbench/RouteWorkbenchFrame.tsx', routeFrame],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(artifactsView).toContain('RouteWorkbenchFrame');
    expect(artifactsView).not.toContain('MonacoCodeViewer');
    expect(artifactsView).not.toContain('@monaco-editor/react');

    expect(artifactPreviewTabs).toContain('ArtifactMonacoPreviewPanel');
    expect(artifactPreviewTabs).not.toContain('MonacoCodeViewer');
    expect(artifactPreviewTabs).not.toContain('@monaco-editor/react');
    expect(artifactPreviewTabs).not.toContain('formatStructuredArtifactContent');

    expect(artifactPreviewPanel).toContain('MonacoCodeViewer');
    expect(artifactPreviewPanel).toContain('formatStructuredArtifactContent');
    expect(artifactPreviewPanel).toContain('language="json"');
    expect(artifactPreviewPanel).not.toContain('Button');
    expect(artifactPreviewPanel).not.toContain('viewFullFile');

    expect(monacoViewer).toContain("lazy(() => import('./MonacoCodeSurface'))");
    expect(monacoSurface).toContain('<Editor');
    expect(monacoSurface).toContain('readOnly: true');
    expect(monacoSurface).toContain('domReadOnly: true');
    expect(monacoSurface).toContain('contextmenu: false');
    expect(monacoSurface).not.toContain('onChange');
    expect(monacoSurface).not.toContain('onMount');
    expect(monacoSurface).not.toContain('save');

    for (const canvasModule of collectProductionSourceFiles(path.join(APP_ROOT, 'views/canvas'))) {
      const source = readFileSync(canvasModule, 'utf8');
      expect(source, canvasModule).not.toContain('@monaco-editor/react');
      expect(source, canvasModule).not.toContain('MonacoCodeViewer');
      expect(source, canvasModule).not.toContain('MonacoDiffViewer');
    }
  });
});
