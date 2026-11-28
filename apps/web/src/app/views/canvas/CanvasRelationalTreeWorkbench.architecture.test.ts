import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { readArchitectureSiblingSource } from '../architecture.test.support';
import './CanvasRelationalTreeWorkbench.presentation.test-cases';
import './CanvasRelationalTreeWorkbench.authoring.test-cases';

import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import CanvasShellSource from './CanvasShell.tsx?raw';
import WorkbenchSurfacesSource from './canvasShellWorkbenchSurfaces.tsx?raw';
import ModelEditorSource from './CanvasModelEditor.tsx?raw';
import CodeWorkbenchSource from './DvtTransformCodeWorkbenchContent.tsx?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import CatalogueMemoSource from './useCanvasRelationalTreeCatalogue.ts?raw';

const readSource = (name: string): string =>
  readArchitectureSiblingSource(import.meta.dirname, name);

type StaticImport = Readonly<{ path: string; typeOnly: boolean }>;

function staticImports(source: string, fileName: string): StaticImport[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest);
  return file.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return [];
    const { importClause, moduleSpecifier } = statement;
    if (!ts.isStringLiteral(moduleSpecifier)) return [];
    return [
      {
        path: moduleSpecifier.text,
        typeOnly: importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword,
      },
    ];
  });
}

function runtimeImports(source: string, fileName: string): string[] {
  return staticImports(source, fileName)
    .filter(({ typeOnly }) => !typeOnly)
    .map(({ path }) => path);
}

describe('Canvas relational Workbench composition boundaries', () => {
  it('keeps Model and Code SQL acquisition behind one protected query lifecycle', () => {
    for (const name of ['CanvasModelSqlOutput.tsx', 'DvtTransformOutputView.tsx']) {
      const imports = staticImports(readSource(name), name);
      expect(imports.map(({ path }) => path)).toContain('./useCanvasTransformSqlOutput');
      expect(
        imports.some(({ path }) => /postgres-projection|services\/canvas|adapters/.test(path))
      ).toBe(false);
      expect(
        imports.some(
          ({ path, typeOnly }) => !typeOnly && path === './canvasDvtSubstraitOutputProjection'
        )
      ).toBe(false);
    }
  });
  it('keeps graph queries behind the Workbench read dependencies', () => {
    expect(
      runtimeImports(WorkbenchSource, 'CanvasRelationalTreeWorkbench.tsx').some((path) =>
        /@dvt\/(?:contracts|substrait-analysis|postgres-projection)|services|adapters|stores/.test(
          path
        )
      )
    ).toBe(false);
  });
  it('keeps catalogue memoization limited to the existing read-only projectors', () => {
    expect(
      runtimeImports(CatalogueMemoSource, 'useCanvasRelationalTreeCatalogue.ts').sort()
    ).toEqual(['./canvasRelationalTreeCatalogue', 'react']);
    expect(CatalogueMemoSource.match(/\buseMemo\s*\(/g)).toHaveLength(1);
    for (const projector of [
      'projectCanvasRelationalTreeCatalogue',
      'projectPendingCanvasRelationalTreeCatalogue',
      'projectCanvasRelationalCatalogueSelection',
    ]) {
      const call = new RegExp(`\\b${projector}\\s*\\(`);
      expect(CatalogueMemoSource).toMatch(call);
      expect(WorkbenchModelSource).not.toMatch(call);
    }
    expect(CatalogueMemoSource).not.toMatch(
      /\b(?:useState|useEffect|useQuery|useMutation|useSyncExternalStore|fetch)\s*\(|\.(?:subscribe|apply)\s*\(/
    );
    expect(WorkbenchModelSource).toContain('useCanvasRelationalTreeCatalogue(');
  });
  it('routes Models to one editor owner', () => {
    expect(CanvasShellSource).toContain('buildCanvasModelWorkbenchLayout(');
    expect(CanvasShellSource).not.toContain('<CanvasModelEditor');
    expect(WorkbenchSurfacesSource.match(/<CanvasModelEditor\b/g)).toHaveLength(1);
    expect(WorkbenchSurfacesSource).not.toContain('<CanvasRelationalTreeWorkbench');
    expect(CanvasShellSource).not.toContain('<CanvasRelationalTreeWorkbench');
    expect(CanvasShellSource).not.toContain("selectOperationalDrawerTab('semantic')");
    expect(ModelEditorSource).toContain('<CanvasRelationalTreeWorkbench');
    expect(ModelEditorSource).not.toContain("from 'react-dom'");
    expect(ModelEditorSource).toContain("draftStatus.persistence !== 'durable'");
    expect(ModelEditorSource).not.toContain(
      '[&:has([data-slot=canvas-relational-tree-apply])_[data-slot=canvas-model-save-status]]:hidden'
    );
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalTreeWorkbench');
    expect(CodeWorkbenchSource).not.toContain('pendingCompositionAuthoring');
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalCompositionTruth');
    expect(Object.keys(import.meta.glob('./DvtSubstraitTransformStart.tsx'))).toEqual([]);
    expect(
      Object.keys(
        import.meta.glob([
          './DvtSubstraitCompositionStart*.tsx',
          './DvtSubstraitInnerJoinStartSection.tsx',
          './DvtRelationCompositionConfirmation*.tsx',
          './DvtRelationalOperationChooser.tsx',
          './DvtRelationAuthoringSection.tsx',
          './CanvasRelationOperatorFields.tsx',
        ])
      )
    ).toEqual([]);
  });
});
