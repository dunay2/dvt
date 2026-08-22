/** Owned concern: guard Code Monaco working-tree synchronization boundaries. */
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
  it('documents working-tree synchronization through the existing command rail', () => {
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/code-workbench-workspace-files-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/code-workbench-workspace-files-user-stories.md'
    );
    const authorityDecision = readRepoDoc('docs/adr/ADR-0060-dbt-project-authoring-authority.md');

    for (const requiredText of [
      'CodeWorkingTreeSync',
      'MonacoCodeEditor',
      'project working tree',
      'SaveWorkspaceFileContent',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'expectedRevision',
      'no Save button',
    ]) {
      expect(componentGuide).toContain(requiredText);
    }

    for (const requiredStory of [
      'CODE-FILES-2',
      'CODE-FILES-6',
      'revision-guarded sync',
      'no Save UI',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    expect(authorityDecision).toContain('It is not a user-facing `Save` action');
    expect(authorityDecision).toContain('does not imply staging, committing, pushing');
  });

  it('keeps Code editable and delegates conditional writes to one orchestrator', () => {
    const codeView = readAppSource('views/CodeView.tsx');
    const codeEditor = readAppSource('components/monaco/MonacoCodeEditor.tsx');
    const codeViewer = readAppSource('components/monaco/MonacoCodeViewer.tsx');
    const codeSurface = readAppSource('components/monaco/MonacoCodeSurface.tsx');
    const workspaceFileCodeEditor = readAppSource('views/code/WorkspaceFileCodeEditor.tsx');
    const workingTreeSync = readAppSource('views/code/useCodeWorkingTreeSync.ts');
    const workingTreeStatus = readAppSource('views/code/CodeWorkingTreeStatus.tsx');
    const canvasShell = readAppSource('views/canvas/CanvasShell.tsx');
    const sqlContextWorkbench = readAppSource('views/canvas/SqlContextWorkbench.tsx');
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
      ['views/code/WorkspaceFileCodeEditor.tsx', workspaceFileCodeEditor],
      ['views/code/useCodeWorkingTreeSync.ts', workingTreeSync],
      ['views/code/CodeWorkingTreeStatus.tsx', workingTreeStatus],
      ['views/canvas/SqlContextWorkbench.tsx', sqlContextWorkbench],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(dbtContributions).toContain("id: 'dbt.canvas'");
    expect(dbtContributions).not.toContain("id: 'dbt.code'");
    expect(dbtContributions).not.toContain("scope: 'workspace'");

    expect(codeView).toContain('WorkspaceFileCodeEditor');
    expect(codeView).toContain('publishRouteBootstrap = true');
    expect(codeView).toContain('resolveCodeViewCopy');
    expect(codeView).not.toContain('CodeWorkspaceFileSurface');
    expect(codeView).not.toContain('resolveCodeWorkspaceFileEditPosture');
    expect(codeView).not.toContain('useCodeWorkingTreeSync');
    expect(codeView).not.toContain('CodeWorkingTreeStatus');
    expect(codeView).not.toContain('useState<Record<string, string>>');
    expect(codeView).not.toContain('useCodeEditableBuffer');
    expect(codeView).not.toContain('MonacoCodeEditor');
    expect(codeView).not.toContain('MonacoCodeViewer');
    expect(codeView).not.toContain('function flattenFiles');
    expect(codeView).not.toContain('function firstFilePath');
    expect(codeView).not.toContain('Editing ');
    expect(codeView).not.toContain('SaveWorkspaceFileContent');
    expect(codeView).not.toContain('saveFileContent');

    expect(workspaceFileCodeEditor).toContain('CodeWorkspaceFileSurface');
    expect(workspaceFileCodeEditor).toContain('resolveCodeWorkspaceFileEditPosture');
    expect(workspaceFileCodeEditor).toContain('useCodeWorkingTreeSync');
    expect(workspaceFileCodeEditor).toContain('CodeWorkingTreeStatus');
    expect(workspaceFileCodeEditor).not.toContain('SaveWorkspaceFileContent');

    expect(workingTreeSync).toMatch(/commandPort\s*\.saveFileContent/);
    expect(workingTreeSync).toContain("kind: 'content_sha256'");
    expect(workingTreeSync).toContain('WorkspaceFileRevisionConflictError');
    expect(workingTreeStatus).not.toContain('Save');

    expect(codeEditor).toContain('useMonacoCodeSurface');
    expect(codeEditor).toContain('readOnly = false');
    expect(codeEditor).toContain('readOnly={readOnly}');
    expect(codeEditor).toContain('onChange');
    expect(codeEditor).not.toContain('Cargando');
    expect(codeEditor).not.toContain('Loading Monaco editor');

    expect(codeViewer).toContain('readOnly={true}');
    expect(codeViewer).not.toContain('onChange');
    expect(codeViewer).not.toContain('Cargando');
    expect(codeViewer).not.toContain('Loading Monaco viewer');

    expect(codeSurface).toContain('readOnly = true');
    expect(codeSurface).toContain('onChange');
    expect(codeSurface).not.toContain('save');

    expect(canvasShell).toContain('<SqlContextWorkbench');
    expect(sqlContextWorkbench).toContain('import CodeView, { type CodeViewFileScope');
    expect(sqlContextWorkbench).toContain('publishRouteBootstrap={false}');
    expect(sqlContextWorkbench).not.toContain('useCodeWorkingTreeSync');

    expect(cypressSpec).toContain(
      'Owned concern: prove canonical Canvas Project Code working-tree synchronization'
    );
    expect(cypressSpec).toContain("visitWithE2eWorkspaceSession('/canvas')");
    expect(cypressSpec).toContain('canvas-workspace-open-project-code-command');
    expect(cypressSpec).toContain('code-working-tree-status');
  });
});
