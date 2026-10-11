/** Owned concern: keep card deletion policy independent of React, and consent free of mutation authority. */
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readArchitectureSiblingSource } from '../architecture.test.support';

function imports(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readArchitectureSiblingSource(import.meta.dirname, file),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  return source.statements.flatMap((statement) =>
    ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text]
      : []
  );
}

describe('card removal responsibility boundaries', () => {
  it('keeps the consent view passive and the policy independent of presentation and persistence', () => {
    expect(imports('CanvasCardRemovalBar.tsx').sort()).toEqual([
      './CanvasCardRemovalBar.module.css',
      'react',
    ]);
    const policy = imports('canvasCardRemoval.ts');
    expect(policy).not.toContain('react');
    expect(policy.every((path) => !/services|api|store|components|useCanvas/.test(path))).toBe(
      true
    );
    expect(imports('useCanvasRelationalTreeRemoval.ts')).not.toContain('./useRelationRemoval');
  });
});
