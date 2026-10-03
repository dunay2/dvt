/** @ownedConcern Prove browser obligations are independent from Vitest coverage. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest.suites';
import { parseChangedSuiteArgs } from '../../scripts/run-vitest-changed-suites';

const spec = 'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';
const helper = 'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts';
const dataHelper = 'apps/web/cypress/e2e/canvas/canvasNodeDataActions.proof.ts';
const retired = 'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts';

describe('governed browser evidence routing', () => {
  it.each([spec, helper, dataHelper, spec.replaceAll('/', '\\'), spec.slice('apps/web/'.length)])(
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

  it.each([retired, retired.replaceAll('/', '\\'), retired.slice('apps/web/'.length)])(
    'requires the retirement guard and real proof when the retired path changes: %s',
    (file) => {
      const plan = resolveWebVitestChangedSuitePlan([file]);
      expect(plan.suites).toEqual(['architecture']);
      expect(plan.commandPlan).toEqual(
        resolveWebVitestChangedSuitePlan([
          'apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts',
        ]).commandPlan
      );
      expect(plan.browserCommands).toEqual(['pnpm run test:e2e:selected-closure:live']);
      expect(existsSync(resolve(retired.slice('apps/web/'.length)))).toBe(false);
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
    'apps/api/vitest.integration.config.ts',
    'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
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

  it.each([
    [helper, 'interruptLiveRunEventFeed'],
    [dataHelper, 'registerCanvasNodeDataActionsProof'],
  ])('guards exclusive ownership and registration of %s', (helperPath, registerName) => {
    const cypressRoot = resolve('cypress');
    const target = resolve(helperPath.slice('apps/web/'.length));
    const consumers = new Set<string>();
    let registrations = 0;
    for (const file of readdirSync(cypressRoot, { recursive: true, withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.ts')) continue;
      const path = resolve(file.parentPath, file.name);
      const ast = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      const visit = (node: ts.Node): void => {
        if (
          path === resolve(spec.slice('apps/web/'.length)) &&
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === registerName
        )
          registrations++;
        if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
          const imported = resolve(dirname(path), node.text);
          if ([imported, `${imported}.ts`].includes(target)) consumers.add(path);
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    expect([...consumers]).toEqual([resolve(spec.slice('apps/web/'.length))]);
    expect(registrations).toBe(1);
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
