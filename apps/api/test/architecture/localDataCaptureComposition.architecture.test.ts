/** @ownedConcern Verify the protected runtime actually calls the narrow LOCAL composition. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { expectTypeOf, it } from 'vitest';

import type { LocalDataCaptureRuntime } from '../../src/application/ports/localDataAcquisition.js';
import type { ProtectedRuntimeModule } from '../../src/modules/types.js';

const directory = fileURLToPath(new globalThis.URL('../../src/', import.meta.url));

function invokedImports(relative: string): Set<string> {
  const filename = path.join(directory, relative);
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const imports = new Map<string, string>();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.importClause?.isTypeOnly
    )
      continue;
    const bindings = node.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      if (!binding.isTypeOnly)
        imports.set(
          binding.name.text,
          path.resolve(path.dirname(filename), node.moduleSpecifier.text).replace(/\.js$/u, '.ts')
        );
    }
  }
  const called = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      ts.isIdentifier(node.expression)
    ) {
      const target = imports.get(node.expression.text);
      if (target) called.add(target);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return called;
}

it('invokes the LOCAL factory from protected composition and constructs its real application owners', () => {
  const factory = 'modules/localData/buildLocalDataCaptureRuntime.ts';
  assert(
    invokedImports('modules/buildProtectedRuntimeModule.ts').has(path.join(directory, factory))
  );
  const owners = invokedImports(factory);
  for (const owner of ['captureLocalDatasetUseCase', 'readLocalDataGenerationMetadataUseCase']) {
    assert(owners.has(path.join(directory, 'application/services', `${owner}.ts`)));
  }
});

it('exposes only the optional command and metadata query ports', () => {
  expectTypeOf<ProtectedRuntimeModule['localData']>().toEqualTypeOf<
    LocalDataCaptureRuntime | undefined
  >();
  expectTypeOf<keyof LocalDataCaptureRuntime>().toEqualTypeOf<
    'captureLocalDataset' | 'readLocalDataGenerationMetadata'
  >();
});
