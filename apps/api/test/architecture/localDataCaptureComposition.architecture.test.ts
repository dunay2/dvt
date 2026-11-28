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

function importedNames(clause: ts.ImportClause | undefined): string[] {
  if (clause?.phaseModifier === ts.SyntaxKind.TypeKeyword) return [];
  const bindings = clause?.namedBindings;
  if (bindings === undefined || !ts.isNamedImports(bindings)) return [];
  return bindings.elements
    .filter((binding) => !binding.isTypeOnly)
    .map((binding) => binding.name.text);
}

function namedRuntimeImports(source: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>();
  for (const node of source.statements.filter(ts.isImportDeclaration)) {
    if (!ts.isStringLiteral(node.moduleSpecifier)) continue;
    const target = path
      .resolve(path.dirname(source.fileName), node.moduleSpecifier.text)
      .replace(/\.js$/u, '.ts');
    for (const name of importedNames(node.importClause)) {
      imports.set(name, target);
    }
  }
  return imports;
}

function invokedName(node: ts.Node): string | undefined {
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return undefined;
  return ts.isIdentifier(node.expression) ? node.expression.text : undefined;
}

function invokedImports(relative: string): Set<string> {
  const filename = path.join(directory, relative);
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const imports = namedRuntimeImports(source);
  const called = new Set<string>();
  const visit = (node: ts.Node): void => {
    const name = invokedName(node);
    const target = name === undefined ? undefined : imports.get(name);
    if (target !== undefined) called.add(target);
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
