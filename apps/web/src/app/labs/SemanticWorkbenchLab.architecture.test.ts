/** Keep the local lab on the production editor and command rail, without a second engine. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

describe('semantic lab dependency boundary', () => {
  it('depends on the production editor and existing authoring command, not provider admission or a duplicate panel', () => {
    const path = join(import.meta.dirname, 'SemanticWorkbenchLab.tsx');
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const dependencies = source.statements
      .filter(ts.isImportDeclaration)
      .map((statement) =>
        ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : ''
      );
    expect(dependencies).toEqual(
      expect.arrayContaining([
        '../views/canvas/CanvasRelationalTreeWorkbench',
        '../views/canvas/canvasInspectorAuthoringCommand',
      ])
    );
    expect(dependencies.filter((dependency) => dependency.startsWith('@dvt/'))).toEqual([]);
  });
});
