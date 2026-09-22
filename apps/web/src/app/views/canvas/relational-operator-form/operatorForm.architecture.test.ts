/** Owned concern: enforce the operator form's presentation/command boundary. */
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import containerSource from '../CanvasRelationalTreeOperatorForm.tsx?raw';
import viewSource from './OperatorFormView.tsx?raw';
import fieldsSource from './OperatorFormFields.tsx?raw';
import sortSource from './SortKeyFields.tsx?raw';
import controllerSource from './useOperatorForm.ts?raw';

describe('operator form component boundary', () => {
  it.each([
    ['CanvasRelationalTreeOperatorForm.tsx', containerSource],
    ['OperatorFormView.tsx', viewSource],
    ['OperatorFormFields.tsx', fieldsSource],
    ['SortKeyFields.tsx', sortSource],
  ])('%s is a bounded view without semantic commands or data access', (file, text) => {
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
    const text = controllerSource;
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
