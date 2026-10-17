/** Owned concern: prevent recovery state ownership from leaking back into presentation. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { inspectEmbeddedComponentStyles } from '../../../testing/embeddedComponentStyles.test.support';

function importsOf(path: string): ReadonlyArray<Readonly<{ module: string; typeOnly: boolean }>> {
  const source = ts.createSourceFile(
    path,
    readFileSync(resolve(import.meta.dirname, path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  return source.statements.filter(ts.isImportDeclaration).map((declaration) => ({
    module: (declaration.moduleSpecifier as ts.StringLiteral).text,
    typeOnly: declaration.importClause?.isTypeOnly === true,
  }));
}

describe('source import recovery boundaries', () => {
  it('keeps the transition policy free of React, transport and view dependencies', () => {
    expect(importsOf('sourceImportRequestState.ts')).toEqual([
      { module: './types', typeOnly: true },
    ]);
  });

  it.each(['SourceImportCatalogRecovery.tsx', 'ConnectionStep.tsx'])(
    'keeps %s passive behind its binding',
    (path) => {
      const imports = importsOf(path);
      expect(imports.some(({ module }) => module.endsWith('.binding'))).toBe(true);
      expect(
        imports
          .filter(({ typeOnly }) => !typeOnly)
          .map(({ module }) => module)
          .filter((module) => /(?:ports|services|useSourceImport)/u.test(module))
      ).toEqual([]);
    }
  );

  it.each(['SourceImportCatalogRecovery.tsx', 'ConnectionStep.tsx', 'WizardStepContent.tsx'])(
    'keeps authored appearance outside %s',
    (path) => {
      expect(
        inspectEmbeddedComponentStyles(readFileSync(resolve(import.meta.dirname, path), 'utf8'))
      ).toEqual([]);
    }
  );
});
