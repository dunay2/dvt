/** Owned concern: guard Code Monaco editable-buffer access semantics and documentation closure. */
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

describe('Code Monaco editable access architecture', () => {
  it('documents local editable buffer semantics without inventing a save command', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/code-workbench-workspace-files-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/code-workbench-workspace-files-user-stories.md'
    );
    const rationale = readRepoDoc(
      'docs/planning/proposals/monaco-workbench-integration-rationale-20260402.md'
    );
    const mailboxAnalysis = readRepoDoc(
      'buzon/20260520-f17g-fowler-code-monaco-editable-workspace-access-analysis.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f17g-code-monaco-editable-workspace-access-plan-20260520.md'
    );

    for (const requiredText of [
      'CodeEditableBuffer',
      'MonacoCodeEditor',
      'local editable buffer',
      'SaveWorkspaceFileContent',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'must not persist',
    ]) {
      expect(componentGuide).toContain(requiredText);
    }

    for (const requiredStory of [
      'CODE-FILES-2',
      'CODE-FILES-6',
      'editable local-buffer mode',
      'Monaco accepts typed text',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    expect(rationale).toContain('route-local editable buffer without persistence');
    expect(rationale).toContain('Code is a Canvas workbench tab');
    expect(mailboxAnalysis).toContain('MonacoCodeEditor');
    expect(mailboxAnalysis).toContain('Semantic Fitness Function');
    expect(implementationPlan).toContain(
      'featureId: F17G-CODE-MONACO-EDITABLE-WORKSPACE-ACCESS-20260520'
    );
  });

  it('keeps Code editable, Artifacts read-only, and persistence unwired', () => {
    const codeView = readAppSource('views/CodeView.tsx');
    const codeEditor = readAppSource('components/monaco/MonacoCodeEditor.tsx');
    const codeViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const codeSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');
    const dbtContributions = readAppSource('plugins/dbt/dbtContributions.ts');
    const cypressSpec = readFileSync(
      path.join(APP_ROOT, '../../cypress/e2e/canvas/code-workbench-workspace-files.cy.ts'),
      'utf8'
    );

    for (const [modulePath, source] of [
      ['views/CodeView.tsx', codeView],
      ['components/monaco/MonacoCodeEditor.tsx', codeEditor],
      ['components/monaco/MonacoCodeViewer.tsx', codeViewer],
      ['components/monaco/MonacoCodeSurface.tsx', codeSurface],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(dbtContributions).toContain("id: 'dbt.code'");
    expect(dbtContributions).toContain("scope: 'workspace'");

    expect(codeView).toContain('MonacoCodeEditor');
    expect(codeView).toContain('localBuffers');
    expect(codeView).not.toContain('MonacoCodeViewer');
    expect(codeView).not.toContain('SaveWorkspaceFileContent');
    expect(codeView).not.toContain('saveFileContent');

    expect(codeEditor).toContain("lazy(() => import('./MonacoCodeSurface'))");
    expect(codeEditor).toContain('readOnly={false}');
    expect(codeEditor).toContain('onChange');

    expect(codeViewer).toContain('readOnly={true}');
    expect(codeViewer).not.toContain('onChange');

    expect(codeSurface).toContain('readOnly = true');
    expect(codeSurface).toContain('onChange');
    expect(codeSurface).not.toContain('save');

    expect(cypressSpec).toContain('shows Code beside Graph before a canvas document exists');
    expect(cypressSpec).toContain('select 2 as first_canvas_edit');
  });
});
