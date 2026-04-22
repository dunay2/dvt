/**
 * Owned concern: enforce semantic packaging rules for the StartRunBoundary
 * contract component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  START_RUN_EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES,
  START_RUN_INFRASTRUCTURE_SYSTEM_BACKPRESSURE_CODES,
  START_RUN_SYSTEM_BACKPRESSURE_CODES,
} from '../src/index.js';

const DOCS_ROOT = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/engine/contracts/engine'
);

describe('contracts: StartRunBoundary component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    const docPath = join(DOCS_ROOT, 'start-run-boundary-component.md');
    expect(existsSync(docPath)).toBe(true);

    const docText = readFileSync(docPath, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Component map',
      '## Result taxonomy',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).not.toContain('re-export ports');
    for (const removedShim of [
      'startRunCommandContract.ts',
      'startRunResultContract.ts',
      'startRunContract.ts',
    ]) {
      expect(docText).not.toContain(removedShim);
    }
  });

  it('keeps canonical grouped system-backpressure sets as one source of truth', () => {
    expect(START_RUN_SYSTEM_BACKPRESSURE_CODES).toEqual([
      ...START_RUN_INFRASTRUCTURE_SYSTEM_BACKPRESSURE_CODES,
      ...START_RUN_EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES,
    ]);
    expect(new Set(START_RUN_SYSTEM_BACKPRESSURE_CODES).size).toBe(
      START_RUN_SYSTEM_BACKPRESSURE_CODES.length
    );
  });

  it('derives schema enums from canonical boundary exports instead of local literal lists', () => {
    const schemaSource = readSource(join(import.meta.dirname, '../src/schema-packs/start-run.ts'));

    expect(
      hasNamedImport(
        schemaSource,
        '../contracts/engine/StartRunBoundary.v1.js',
        'SUPPORTED_START_RUN_TARGET_ADAPTERS'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        schemaSource,
        '../contracts/engine/StartRunBoundary.v1.js',
        'START_RUN_SYSTEM_BACKPRESSURE_CODES'
      )
    ).toBe(true);
    expect(schemaSource.sourceText).toContain('z.enum(SUPPORTED_START_RUN_TARGET_ADAPTERS)');
    expect(schemaSource.sourceText).toContain('z.enum(START_RUN_SYSTEM_BACKPRESSURE_CODES)');
  });

  it('keeps fixtures on canonical exports instead of raw boundary-code literals', () => {
    const fixturesSource = readSource(
      join(import.meta.dirname, './fixtures/start-run-boundary.fixtures.ts')
    );

    expect(
      hasNamedImport(fixturesSource, '../../src/index.js', 'START_RUN_BACKPRESSURE_CODE')
    ).toBe(true);
    expect(hasNamedImport(fixturesSource, '../../src/index.js', 'START_RUN_TARGET_ADAPTER')).toBe(
      true
    );

    for (const rawLiteral of [
      "'TENANT_BACKPRESSURE'",
      "'BACKPRESSURE_SNAPSHOT_UNAVAILABLE'",
      "'CAPACITY_SIGNAL_UNAVAILABLE'",
      "'OUTBOX_RATE_LIMIT_EXCEEDED'",
      "targetAdapter: 'temporal'",
      "targetAdapter: 'mock'",
    ]) {
      expect(fixturesSource.sourceText).not.toContain(rawLiteral);
    }
  });
});

type SourceView = {
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
};

function readSource(path: string): SourceView {
  const sourceText = readFileSync(path, 'utf8');
  return {
    sourceText,
    sourceFile: ts.createSourceFile(
      path,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    ),
  };
}

function hasNamedImport(
  source: SourceView,
  moduleSpecifier: string,
  importedName: string
): boolean {
  return collectNamedImports(source, moduleSpecifier).includes(importedName);
}

function collectNamedImports(source: SourceView, moduleSpecifier: string): string[] {
  const imports: string[] = [];

  for (const statement of source.sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.moduleSpecifier.getText(source.sourceFile) !== `'${moduleSpecifier}'`) {
      continue;
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const element of namedBindings.elements) {
      imports.push(element.name.text);
    }
  }

  return imports;
}
