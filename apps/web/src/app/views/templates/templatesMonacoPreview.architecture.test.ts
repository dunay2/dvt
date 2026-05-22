/** Owned concern: guard Templates route Monaco preview semantics and documentation closure. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const APP_ROOT = path.resolve(__dirname, '../..');

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readRepoDoc(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
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

describe('Templates Monaco preview architecture', () => {
  it('documents API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-monaco-preview-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-monaco-preview-user-stories.md'
    );
    const mailboxAnalysis = readRepoDoc(
      'buzon/20260522-f17d-fowler-templates-monaco-preview-analysis.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17d-templates-monaco-preview-plan-20260522.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'TemplateMonacoPreviewPanel',
      'MonacoCodeViewer',
      'MonacoCodeSurface',
      'ExecutionTemplatePreviewProjection',
      'read-only',
      'GenerateExecutionTemplatePreview',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-F17D-001',
      'US-F17D-002',
      'US-F17D-003',
      'US-F17D-004',
      'US-F17D-005',
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

    expect(implementationPlan).toContain('featureId: F17D-TEMPLATES-MONACO-PREVIEW-20260522');
    expect(implementationPlan).toContain('templatesMonacoPreview.architecture.test.ts');
  });

  it('keeps Monaco as a lazy read-only Templates preview panel instead of route, shell, or Canvas authority', () => {
    const templatesView = readAppSource('views/TemplatesView.tsx');
    const workbench = readAppSource('views/templates/TemplatesRouteWorkbench.tsx');
    const previewPanelPath = path.join(APP_ROOT, 'views/templates/TemplateMonacoPreviewPanel.tsx');
    expect(existsSync(previewPanelPath)).toBe(true);
    const previewPanel = readFileSync(previewPanelPath, 'utf8');
    const monacoViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const monacoSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');

    for (const [modulePath, source] of [
      ['views/TemplatesView.tsx', templatesView],
      ['views/templates/TemplatesRouteWorkbench.tsx', workbench],
      ['views/templates/TemplateMonacoPreviewPanel.tsx', previewPanel],
      ['components/monaco/MonacoCodeViewer.tsx', monacoViewer],
      ['components/monaco/MonacoCodeSurface.tsx', monacoSurface],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(templatesView).toContain('RouteWorkbenchFrame');
    expect(templatesView).not.toContain('MonacoCodeViewer');
    expect(templatesView).not.toContain('@monaco-editor/react');

    expect(workbench).toContain('TemplateMonacoPreviewPanel');
    expect(workbench).not.toContain('@monaco-editor/react');
    expect(workbench).not.toContain('MonacoCodeViewer');
    expect(workbench).not.toContain('<pre');
    expect(workbench).toContain('templates-validation-state');

    expect(previewPanel).toContain('MonacoCodeViewer');
    expect(previewPanel).toContain('language={language}');
    expect(previewPanel).toContain('path={exportFileName}');
    expect(previewPanel).not.toContain('onChange');
    expect(previewPanel).not.toMatch(/\b(save|apply|dispatch|persist)\b/i);

    expect(monacoViewer).toContain("lazy(() => import('./MonacoCodeSurface'))");
    expect(monacoViewer).toContain('readOnly={true}');
    expect(monacoSurface).toContain('<Editor');
    expect(monacoSurface).toContain('readOnly: isReadOnly');
    expect(monacoSurface).toContain('domReadOnly: isReadOnly');

    for (const canvasModule of collectProductionSourceFiles(path.join(APP_ROOT, 'views/canvas'))) {
      const source = readFileSync(canvasModule, 'utf8');
      expect(source, canvasModule).not.toContain('@monaco-editor/react');
      expect(source, canvasModule).not.toContain('MonacoCodeViewer');
      expect(source, canvasModule).not.toContain('MonacoCodeEditor');
      expect(source, canvasModule).not.toContain('MonacoDiffViewer');
    }
  });
});
