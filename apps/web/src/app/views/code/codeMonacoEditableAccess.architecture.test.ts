/** Owned concern: guard semantic dependency boundaries for workspace Code and shared Monaco. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function importsOf(relativePath: string, mode: 'all' | 'runtime' = 'all'): ReadonlySet<string> {
  const source = ts.createSourceFile(
    relativePath,
    readFileSync(path.join(APP_ROOT, relativePath), 'utf8'),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX
  );
  return new Set(
    source.statements.flatMap((statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      (mode === 'all' || !statement.importClause?.isTypeOnly)
        ? [statement.moduleSpecifier.text]
        : []
    )
  );
}

describe('Code workspace ownership boundaries', () => {
  it('composes the shared file-session owner instead of a second Monaco or writer', () => {
    const imports = importsOf('views/CodeView.tsx');
    expect(imports.has('./code/WorkspaceFileCodeEditor')).toBe(true);
    for (const forbidden of [
      './code/useCodeWorkingTreeSync',
      '../components/monaco/MonacoCodeEditor',
      '../components/monaco/MonacoCodeViewer',
      '../services/workspace/workspacePorts.api',
    ])
      expect(imports.has(forbidden)).toBe(false);
  });

  it.each([
    'views/canvas/dbtWorkspaceFileCodeContribution.tsx',
    'views/canvas/graphDraftWorkspaceFileCodeContribution.tsx',
  ])('%s shares the existing known-file owner', (consumer) => {
    const imports = importsOf(consumer);
    expect(imports.has('../code/WorkspaceFileCodeEditor')).toBe(true);
    expect(imports.has('../code/useCodeWorkingTreeSync')).toBe(false);
    expect(imports.has('../../components/monaco/MonacoCodeEditor')).toBe(false);
  });

  it('keeps access policy and pending-write recovery at their existing owners', () => {
    const imports = importsOf('views/code/WorkspaceFileCodeEditor.tsx');
    const session = importsOf('views/code/useWorkspaceFileEditorSession.ts');
    expect(imports.has('./useWorkspaceFileEditorSession')).toBe(true);
    expect(session.has('./codeWorkspaceFileEditPosture')).toBe(true);
    expect(session.has('./useCodeWorkingTreeSync')).toBe(true);
    expect(imports.has('../../services/workspace/workspacePorts.api')).toBe(false);
    expect(session.has('../../services/workspace/workspacePorts.api')).toBe(false);
    expect(imports.has('./WorkspaceFileCodeEditorView')).toBe(true);
  });

  // A layout extraction must not silently become a second session/query controller.
  it('keeps the editor view passive and delegates its existing shared surface', () => {
    const imports = importsOf('views/code/WorkspaceFileCodeEditorView.tsx', 'runtime');
    expect(imports.has('./CodeWorkspaceFileSurface')).toBe(true);
    expect(
      [...imports].filter((dependency) =>
        /(?:^|\/)(?:services|queries|stores)(?:\/|$)|\.\/useWorkspaceFileEditorSession|\.\/useCodeInlineReferences/.test(
          dependency
        )
      )
    ).toEqual([]);
  });

  it('keeps visible-state projection independent from query, store and React runtimes', () => {
    const imports = importsOf('views/code/workspaceFileEditorPresentation.ts', 'runtime');
    expect(
      [...imports].filter((dependency) =>
        /(?:^|\/)(?:services|queries|stores)(?:\/|$)|^react(?:\/|$)|^@tanstack\//.test(dependency)
      )
    ).toEqual([]);
  });

  it('keeps shared Monaco independent of workspace persistence', () => {
    const imports = importsOf('components/monaco/MonacoCodeSurface.tsx');
    expect(
      [...imports].filter((dependency) =>
        /(?:^|\/)services(?:\/|$)|(?:^|\/)ports(?:\/|$)|useCodeWorkingTreeSync/.test(dependency)
      )
    ).toEqual([]);
  });
});
