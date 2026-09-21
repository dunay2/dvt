/** Owned concern: keep occurrence binding independent from presentation, persistence and execution. */
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import identity from './joinOccurrenceIdentity.ts?raw';
import physical from './joinPhysicalBindings.ts?raw';
import identitiesTest from './joinOccurrenceIdentity.test.ts?raw';
import reopenTest from './occurrenceReopen.test.ts?raw';
import fixture from './occurrence.test.fixtures.ts?raw';
import retained from './retainedReadProjection.ts?raw';
import removalTest from './occurrenceRemoval.test.ts?raw';

describe('source occurrence component boundaries', () => {
  it.each([
    ['identity policy', identity],
    ['physical binding', physical],
    ['identity scenarios', identitiesTest],
    ['reopen scenarios', reopenTest],
    ['fixture', fixture],
    ['retained projection', retained],
    ['removal scenarios', removalTest],
  ])('%s remains a concern-owned module within 200 lines', (_, text) => {
    expect(text.trimEnd().split('\n').length).toBeLessThanOrEqual(200);
  });

  it.each([
    ['identity policy', identity],
    ['physical binding', physical],
  ])('%s has no presentation, persistence or execution dependency', (name, text) => {
    const module = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    for (const statement of module.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue;
      expect(statement.moduleSpecifier.text).not.toMatch(
        /react|node:|\/(ports|services|stores)\/|Execution|Preview|\.tsx$/u
      );
    }
  });
});
