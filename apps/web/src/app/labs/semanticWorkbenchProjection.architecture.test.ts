import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const OUTPUT_PROJECTION = readFileSync(
  join(import.meta.dirname, '../views/canvas/canvasOutputExpressionProjection.ts'),
  'utf8'
);

function imports(file: string): readonly string[] {
  const path = join(import.meta.dirname, '../views/canvas', file);
  return ts
    .createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
    .statements.filter(ts.isImportDeclaration)
    .flatMap((statement) =>
      ts.isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : []
    );
}

describe('semantic workbench projection architecture', () => {
  it('shares expression drawing and reads output identity without writing or using linear lineage', () => {
    for (const file of ['semanticWorkbenchRelations.ts', 'canvasOutputExpressionProjection.ts']) {
      expect(imports(file)).toContain('./semanticExpressionGraphProjection');
    }
    expect(OUTPUT_PROJECTION).not.toMatch(/\.operations|encodeDvt|applyDvt|localStorage|fetch\(/);
  });
  it('delegates layout to the shared Canvas Dagre authority', () => {
    expect(imports('semanticWorkbenchProjection.ts')).toContain('./semanticWorkbenchLayout');
    expect(imports('semanticWorkbenchLayout.ts')).toContain('./canvasGraphUtils');
    for (const file of [
      'semanticWorkbenchProjection.ts',
      'semanticWorkbenchRelations.ts',
      'semanticWorkbenchLayout.ts',
    ]) {
      expect(imports(file).some((dependency) => dependency.includes('dagre'))).toBe(false);
    }
  });
});
