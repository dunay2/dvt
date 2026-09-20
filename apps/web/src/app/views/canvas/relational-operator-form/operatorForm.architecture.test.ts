/** Owned concern: enforce the operator form's presentation/command boundary. */
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

describe('operator form component boundary', () => {
  it.each([
    '../CanvasRelationalTreeOperatorForm.tsx',
    'OperatorFormView.tsx',
    'OperatorFormFields.tsx',
    'SortKeyFields.tsx',
  ])('%s is a bounded view without semantic commands or data access', (file) => {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const runtimeImports = source.statements
      .filter(ts.isImportDeclaration)
      .filter((node) => !node.importClause?.isTypeOnly)
      .map((node) => (node.moduleSpecifier as ts.StringLiteral).text);
    expect(runtimeImports).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/canvasDvt|OperatorCommands|\/(ports|stores)\//),
      ])
    );
    expect(text.split('\n').length).toBeLessThanOrEqual(200);
  });

  it('keeps command dispatch behind the local form controller', () => {
    const text = readFileSync(new URL('useOperatorForm.ts', import.meta.url), 'utf8');
    const source = ts.createSourceFile('controller.ts', text, ts.ScriptTarget.Latest, true);
    const commandImports = source.statements
      .filter(ts.isImportDeclaration)
      .filter((node) =>
        (node.moduleSpecifier as ts.StringLiteral).text.endsWith('OperatorCommands')
      );
    expect(commandImports).toHaveLength(1);
    expect(text.split('\n').length).toBeLessThanOrEqual(200);
  });
});
