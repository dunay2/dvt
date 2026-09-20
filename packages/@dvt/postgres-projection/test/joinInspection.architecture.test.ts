import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readerModules = [
  'substraitJoinReader.ts',
  'join-inspection/inputs.ts',
  'join-inspection/stages.ts',
  'join-inspection/predicates.ts',
];

describe('shared JOIN inspection component boundaries', () => {
  it.each([
    'joinInspectionAdmission.test.ts',
    'joinInspectionShape.test.ts',
    'joinOutputSelection.test.ts',
    'joinPostgresProjection.test.ts',
    'semiAntiJoinPostgresProjection.test.ts',
    'fixtures/joinDraft.ts',
    'fixtures/semiAntiJoinDraft.ts',
  ])('keeps the focused scenario or fixture %s within 200 lines', (path) => {
    const source = readFileSync(new URL(`./${path}`, import.meta.url), 'utf8');
    expect(source.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
  });

  it.each(readerModules)('%s stays small and independent of UI, SQL and IO', (path) => {
    const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
    expect(source.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
    const module = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const statement of module.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue;
      const dependency = statement.moduleSpecifier.text;
      expect(dependency).not.toMatch(
        /node:|react|pg(?:sql)?|apps\/|Postgres|postgresAst|ProjectionError/
      );
    }
  });

  it('keeps extracted details behind the existing package inspection API', () => {
    const exports = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(exports).toContain("from './substraitJoinReader.js'");
    expect(exports).not.toContain('join-inspection/');
  });
});
