/** @ownedConcern Prove browser obligations are independent from Vitest coverage. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';
import { parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

const spec = 'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';
const helper = 'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts';

describe('governed browser evidence routing', () => {
  it.each([spec, helper, spec.replaceAll('/', '\\'), spec.slice('apps/web/'.length)])(
    'selects the real browser command, not Vitest, for %s',
    (file) => {
      expect(resolveWebVitestChangedSuitePlan([file])).toMatchObject({
        suites: [],
        commandPlan: [],
        requiresDependencies: false,
        browserCommands: ['pnpm run test:e2e:selected-closure:live'],
      });
    }
  );

  it('retains source obligations and runs shared browser evidence only once in a mixed diff', () => {
    const source = 'apps/web/src/lib/format.ts';
    const mixed = resolveWebVitestChangedSuitePlan([helper, spec, source, helper]);
    expect(mixed.commandPlan).toEqual(resolveWebVitestChangedSuitePlan([source]).commandPlan);
    expect(mixed.suites).toEqual(['unit']);
    expect(mixed.browserCommands).toEqual(['pnpm run test:e2e:selected-closure:live']);
    expect(resolveWebVitestChangedSuitePlan([source]).browserCommands).toEqual([]);
  });

  it.each([
    'apps/web/cypress/e2e/new.cy.ts',
    'apps/web/cypress/support/e2e.ts',
    'apps/web/cypress/support/liveProtectedRuntime.ts',
    'apps/web/cypress/fixtures/new.json',
    'apps/web/cypress.config.ts',
    'apps/web/cypress.live.config.ts',
    'cypress.config.ts',
  ])('rejects browser surfaces without admitted consumer evidence: %s', (file) => {
    expect(() => resolveWebVitestChangedSuitePlan([file])).toThrow(file);
    expect(() => resolveWebVitestChangedSuitePlan([spec, file], { full: true })).toThrow(file);
  });

  it.each([
    'apps/web/cypress.changed.ts',
    'apps/web/scripts/run-vitest-changed-suites.ts',
    '.github/workflows/test.yml',
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-cypress.cjs',
    'scripts/live-proof-process.cjs',
    'apps/api/package.json',
  ])('requires the live baseline for changes to its execution boundary: %s', (file) => {
    expect(resolveWebVitestChangedSuitePlan([file]).browserCommands).toEqual([
      'pnpm run test:e2e:selected-closure:live',
    ]);
  });

  it('adds the admitted baseline in full mode without fabricating changed paths', () => {
    expect(resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands).toEqual([
      'pnpm run test:e2e:selected-closure:live',
    ]);
    expect(resolveWebVitestChangedSuitePlan([]).browserCommands).toEqual([]);
  });

  it('guards the exclusive helper ownership against new consumers, including re-exports', () => {
    const cypressRoot = resolve('cypress');
    const target = resolve('cypress/e2e/canvas/liveRunEventRecovery.proof.ts');
    const consumers = new Set<string>();
    for (const file of readdirSync(cypressRoot, { recursive: true, encoding: 'utf8' })) {
      if (!file.endsWith('.ts')) continue;
      const path = resolve(cypressRoot, file);
      const ast = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      const visit = (node: ts.Node): void => {
        if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
          const imported = resolve(dirname(path), node.text);
          if ([imported, `${imported}.ts`].includes(target)) consumers.add(path);
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    expect([...consumers]).toEqual([resolve(spec.slice('apps/web/'.length))]);
  });

  it('admits explicit plans but rejects ambiguous or coverage-dropping CLI modes', () => {
    expect(parseChangedSuiteArgs(['--plan', '--full'])).toMatchObject({ plan: true, full: true });
    expect(parseChangedSuiteArgs(['--full', '--browser-only'])).toMatchObject({
      browserOnly: true,
    });
    expect(parseChangedSuiteArgs(['--files', spec])).toMatchObject({ files: [spec] });
    for (const args of [
      ['--browser-only'],
      ['--unknown'],
      ['--files'],
      ['--full'],
      ['--full', '--full'],
    ]) {
      expect(() => parseChangedSuiteArgs(args)).toThrow();
    }
  });
});
