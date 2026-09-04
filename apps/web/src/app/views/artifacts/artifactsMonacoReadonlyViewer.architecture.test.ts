/** Owned concern: guard Artifacts route Monaco read-only viewer semantics and documentation closure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');
const CANVAS_MONACO_READ_ONLY_OWNERS = new Set([
  'views/canvas/DbtModelCodeAuthoringSection.tsx',
  'views/canvas/DvtTransformOutputView.tsx',
]);

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

    for (const requiredPlanSignal of [
      '## Fowler Opportunity Matrix',
      'fowlerSignals:',
      'Documentation drift',
      'Hidden authority',
      'Semantic Fitness Function',
    ]) {
      expect(implementationPlan).toContain(requiredPlanSignal);
    }

    expect(implementationPlan).toContain(
      'featureId: F17C-ARTIFACTS-MONACO-READONLY-VIEWER-20260520'
    );
    expect(implementationPlan).toContain('artifactsMonacoReadonlyViewer.architecture.test.ts');
  });

  it('keeps Monaco behind shared leaves instead of route or shell authority', () => {
    const artifactsView = readAppSource('views/ArtifactsView.tsx');
    const workspaceQueries = readAppSource('queries/workspaceQueries.ts');
    const workspaceArtifactPolicy = readAppSource('queries/workspaceArtifactPolicy.ts');
    const artifactPreviewTabs = readAppSource('views/artifacts/ArtifactPreviewTabs.tsx');
    const artifactPreviewPanelPath = path.join(
      APP_ROOT,
      'views/artifacts/ArtifactMonacoPreviewPanel.tsx'
    );
    expect(existsSync(artifactPreviewPanelPath)).toBe(true);
    const artifactPreviewPanel = readFileSync(artifactPreviewPanelPath, 'utf8');
    const monacoViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const monacoEditor = readAppSource('components/monaco/MonacoCodeEditor.tsx');
    const monacoLoader = readAppSource('components/monaco/useMonacoCodeSurface.ts');
    const monacoSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');
    const monacoFallback = readAppSource('components/monaco/MonacoViewerFallback.tsx');
    const monacoVisualTokens = readAppSource('components/monaco/monacoVisualTokens.ts');
    const routeFrame = readAppSource('components/workbench/RouteWorkbenchFrame.tsx');

    for (const [modulePath, source] of [
      ['views/ArtifactsView.tsx', artifactsView],
      ['queries/workspaceQueries.ts', workspaceQueries],
      ['queries/workspaceArtifactPolicy.ts', workspaceArtifactPolicy],
      ['views/artifacts/ArtifactPreviewTabs.tsx', artifactPreviewTabs],
      ['views/artifacts/ArtifactMonacoPreviewPanel.tsx', artifactPreviewPanel],
      ['components/monaco/MonacoCodeViewer.tsx', monacoViewer],
      ['components/monaco/MonacoCodeEditor.tsx', monacoEditor],
      ['components/monaco/useMonacoCodeSurface.ts', monacoLoader],
      ['components/monaco/MonacoCodeSurface.tsx', monacoSurface],
      ['components/monaco/MonacoViewerFallback.tsx', monacoFallback],
      ['components/workbench/RouteWorkbenchFrame.tsx', routeFrame],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(artifactsView).toContain('RouteWorkbenchFrame');
    expect(artifactsView).not.toContain('MonacoCodeViewer');
    expect(artifactsView).not.toContain('@monaco-editor/react');

    expect(workspaceQueries).toContain('classifyWorkspaceArtifact');
    expect(workspaceQueries).not.toContain('^pipelines\\\\/');
    expect(workspaceQueries).not.toContain('^models\\\\/');
    expect(workspaceArtifactPolicy).toContain('WorkspaceArtifactClassification');
    expect(workspaceArtifactPolicy).toContain('classifyWorkspaceArtifact');
    expect(workspaceArtifactPolicy).toContain('/^pipelines\\/.+\\.ya?ml$/u');
    expect(workspaceArtifactPolicy).toContain('/^models\\/.+\\.sql$/u');

    expect(artifactPreviewTabs).toContain('ArtifactMonacoPreviewPanel');
    expect(artifactPreviewTabs).not.toContain('MonacoCodeViewer');
    expect(artifactPreviewTabs).not.toContain('@monaco-editor/react');
    expect(artifactPreviewTabs).not.toContain('formatStructuredArtifactContent');

    expect(artifactPreviewPanel).toContain('MonacoCodeViewer');
    expect(artifactPreviewPanel).toContain('formatStructuredArtifactContent');
    expect(artifactPreviewPanel).toContain("language={document.language ?? 'json'}");
    expect(artifactPreviewPanel).not.toContain('Button');
    expect(artifactPreviewPanel).not.toContain('viewFullFile');

    expect(monacoViewer).toContain('useMonacoCodeSurface()');
    expect(monacoViewer).toContain('readOnly={true}');
    expect(monacoEditor).toContain('useMonacoCodeSurface()');
    expect(monacoEditor).toContain('readOnly = false');
    expect(monacoEditor).toContain('readOnly={readOnly}');
    expect(monacoEditor).toContain('onChange');
    expect(monacoLoader).toContain("import('./MonacoCodeSurface')");
    expect(monacoLoader).toContain('if (active)');
    expect(monacoLoader).toContain('active = false');
    expect(monacoSurface).toContain('<Editor');
    expect(monacoSurface).toContain('readOnly = true');
    expect(monacoSurface).toContain('createMonacoCodeOptions({ ariaLabel, readOnly: isReadOnly })');
    expect(monacoVisualTokens).toContain('readOnly,');
    expect(monacoVisualTokens).toContain('domReadOnly: readOnly');
    expect(monacoVisualTokens).toContain('contextmenu: !readOnly');
    expect(monacoSurface).not.toContain('onMount');
    expect(monacoSurface).not.toContain('save');

    for (const canvasModule of collectProductionSourceFiles(path.join(APP_ROOT, 'views/canvas'))) {
      const source = readFileSync(canvasModule, 'utf8');
      const modulePath = path.relative(APP_ROOT, canvasModule).replaceAll('\\', '/');
      expect(source, modulePath).not.toContain('@monaco-editor/react');
      if (CANVAS_MONACO_READ_ONLY_OWNERS.has(modulePath)) {
        expect(source, modulePath).toContain('MonacoCodeViewer');
      } else {
        expect(source, modulePath).not.toContain('MonacoCodeViewer');
      }
      expect(source, modulePath).not.toContain('MonacoDiffViewer');
      expect(source, modulePath).not.toContain('MonacoCodeEditor');
    }
  });
});
