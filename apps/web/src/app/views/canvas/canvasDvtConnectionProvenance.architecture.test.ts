import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function imports(path: string): string[] {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  return file.statements
    .filter(ts.isImportDeclaration)
    .map((statement) =>
      ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : ''
    );
}

describe('Canvas connection provenance ownership', () => {
  it('keeps the pure read model on existing source/equality authorities with no presentation or I/O dependency', () => {
    expect(
      imports(resolve(import.meta.dirname, 'canvasDvtConnectionProvenance.ts')).sort()
    ).toEqual(
      [
        '../../types/canonical',
        './canvasDvtSourceAuthoring',
        '@dvt/contracts',
        '@dvt/postgres-projection',
      ].sort()
    );
  });
  it('retires duplicate traversal APIs and makes both consumers use the same owner', () => {
    expect(existsSync(resolve(import.meta.dirname, 'canvasDvtResultTargetConnection.ts'))).toBe(
      false
    );
    for (const name of ['canvasDvtSourceAuthoring.ts', 'canvasDvtAuthoringModel.ts']) {
      expect(readFileSync(resolve(import.meta.dirname, name), 'utf8')).not.toContain(
        'resolveInheritedDvtConnectionRef'
      );
    }
    expect(imports(resolve(import.meta.dirname, 'DvtAuthoringFields.tsx'))).toContain(
      './canvasDvtConnectionProvenance'
    );
    expect(
      imports(
        resolve(import.meta.dirname, '../../components/inspector/nodePropertyTopologyRows.ts')
      )
    ).toContain('../../views/canvas/canvasDvtConnectionProvenance');
  });
});
