// @vitest-environment node
/**
 * Owned concern: browser admission by changed surface.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  dataHelper,
  formulaJourney,
  helper,
  liveCommand,
  liveWorkloadConsumers,
  retired,
  semanticExecution,
  spec,
  transformStage,
  treeJourney,
} from './vitestSuites.browserRouting.fixtures';
import { browserModules } from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingSurfaces(): void {
  describe('browser admission by changed surface', () => {
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
        expect(plan.browserCommands).toEqual([liveCommand]);
        expect(existsSync(resolve(retired.slice('apps/web/'.length)))).toBe(false);
      }
    );

    it('retains source obligations and runs shared browser evidence only once in a mixed diff', () => {
      const source = 'apps/web/src/lib/format.ts';
      const mixed = resolveWebVitestChangedSuitePlan([
        helper,
        spec,
        source,
        helper,
        semanticExecution,
        transformStage,
        formulaJourney,
        treeJourney,
        ...liveWorkloadConsumers,
      ]);
      expect(mixed.commandPlan).toEqual(resolveWebVitestChangedSuitePlan([source]).commandPlan);
      expect(mixed.suites).toEqual(['unit', 'architecture']);
      expect(mixed.browserCommands).toEqual([liveCommand]);
      expect(resolveWebVitestChangedSuitePlan([source]).browserCommands).toEqual([]);
    });

    it.each([
      'apps/web/cypress/e2e/new.cy.ts',
      'apps/web/cypress/support/e2e.ts',
      'apps/web/cypress/support/unregisteredRuntime.ts',
      'apps/web/cypress/support/nativeKeyboardUnregistered.ts',
      'apps/web/cypress/support/semanticLive/unregistered.ts',
      'apps/web/cypress/support/relationalWorkbench/unregistered.ts',
      'apps/web/cypress/fixtures/new.json',
      'apps/web/cypress.live.config.ts',
      'apps/web/cypress/node/unregisteredDiagnostic.ts',
      'apps/web/cypress/node/unregisteredDiagnostic.py',
    ])('rejects browser surfaces without admitted consumer evidence: %s', (file) => {
      expect(() => resolveWebVitestChangedSuitePlan([file])).toThrow(file);
      expect(() => resolveWebVitestChangedSuitePlan([spec, file], { full: true })).toThrow(file);
    });

    it.each([
      'apps/web/cypress.config.ts',
      'cypress.config.ts',
      'apps/web/cypress/node/chromiumNetworkDiagnostics.ts',
      'apps/web/cypress/node/chromiumNetworkProjection.ts',
      'apps/web/cypress/node/chromiumNetworkEvidence.ts',
      'apps/web/cypress/node/chromiumProcessObserver.ts',
    ])('exact Node configuration imports retain all browser obligations: %s', (file) => {
      expect(
        resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['controlled', 'available', 'unavailable']);
    });

    it.each([
      'apps/web/cypress/node/linuxChromiumProcessObserver.py',
      'apps/web/cypress/node/linuxChromiumProcessProtocol.py',
      'apps/web/cypress/node/linuxChromiumSignalTrace.py',
      'apps/web/cypress/node/linuxChromiumOomJournal.py',
    ])('Linux observer changes retain the real LIVE execution obligation: %s', (file) => {
      expect(
        resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['available']);
    });

    it.each([
      'apps/web/cypress.changed.ts',
      'apps/web/scripts/run-vitest-changed-suites.ts',
      '.github/workflows/test.yml',
      '.github/actions/setup-native-browser/action.yml',
      'scripts/run-selected-closure-live-proof.cjs',
      'scripts/run-selected-closure-cypress.cjs',
      'scripts/live-proof-process.cjs',
      'apps/api/package.json',
      'apps/api/vitest.integration.config.ts',
      'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
    ])('requires the live baseline for changes to its execution boundary: %s', (file) => {
      expect(
        resolveWebVitestChangedSuitePlan([file]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['controlled', 'available', 'unavailable']);
    });

    it('adds the admitted baseline in full mode without fabricating changed paths', () => {
      expect(
        resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands.map(
          ({ capability }) => capability
        )
      ).toEqual(['controlled', 'available', 'unavailable']);
      expect(resolveWebVitestChangedSuitePlan([]).browserCommands).toEqual([]);
    });

    it('compiled provider runtime changes retain both real obligations without allocating controlled providers', () => {
      expect(
        resolveWebVitestChangedSuitePlan([
          'scripts/live-proof-web-runtime.cjs',
        ]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['available', 'unavailable']);
    });

    it.each([
      [helper, 'interruptLiveRunEventFeed', spec],
      [dataHelper, 'registerCanvasNodeDataActionsProof', spec],
      [formulaJourney, 'exerciseTransformFormulaAuthoring', transformStage],
      [treeJourney, 'exerciseTransformTreeSelection', transformStage],
      [
        'apps/web/cypress/support/semanticLive/progressive.ts',
        'addLiveFormula',
        'apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
      ],
    ])('guards exclusive ownership and registration of %s', (helperPath, registerName, owner) => {
      const target = resolve(helperPath.slice('apps/web/'.length));
      const consumers = new Set<string>();
      let registrations = 0;
      for (const [path, ast] of browserModules) {
        const visit = (node: ts.Node): void => {
          if (
            path === resolve(owner.slice('apps/web/'.length)) &&
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
      expect([...consumers]).toEqual([resolve(owner.slice('apps/web/'.length))]);
      expect(registrations).toBe(1);
    });
  });
}
