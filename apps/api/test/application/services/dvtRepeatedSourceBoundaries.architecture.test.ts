import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const components = [
  'dvtSourceCoverage.ts',
  'dvtRelationFamily.ts',
  'resolveDvtTerminalTransformClosure.ts',
  'dvtPostgresTransformProjection.ts',
];
const scenarios = [
  './dvtRepeatedSourceProjection.test.ts',
  './dvtRepeatedSourceRun.test.ts',
  '../../fixtures/dvtRepeatedSourcePublisher.ts',
  '../../fixtures/dvtRepeatedSourceFixture.ts',
  '../../integration/dvtRepeatedSourcePostgres.integration.test.ts',
];

describe('occurrence versus physical-source boundaries', () => {
  it.each(components)('%s remains a focused component of at most 200 lines', (path) => {
    const code = readFileSync(
      new URL(`../../../src/application/services/${path}`, import.meta.url),
      'utf8'
    );
    expect(code.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
  });

  it.each(scenarios)('%s remains a focused scenario of at most 200 lines', (path) => {
    const code = readFileSync(new URL(path, import.meta.url), 'utf8');
    expect(code.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
  });

  it('keeps source-coverage policy independent of rendering, persistence and provider IO', () => {
    const path = new URL('../../../src/application/services/dvtSourceCoverage.ts', import.meta.url);
    const code = readFileSync(path, 'utf8');
    const module = ts.createSourceFile(path.pathname, code, ts.ScriptTarget.Latest, true);
    const imports = module.statements.filter(ts.isImportDeclaration);
    expect(
      new Set(imports.map((declaration) => (declaration.moduleSpecifier as ts.StringLiteral).text))
    ).toEqual(new Set(['@dvt/contracts']));
  });
});
