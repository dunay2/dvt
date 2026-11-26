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
import { resolveWebCypressChangedPlan } from '../../cypress.changed';
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

const columnViewSourcePaths = [
  'apps/web/src/app/plugins/graph/GraphNodeColumnViews.tsx',
  'apps/web/src/app/plugins/graph/GraphNodeColumnViews.module.css',
];

const columnViewBrowserSpecs = [
  'apps/web/cypress/e2e/canvas/canvas-model-chain-fields.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts',
];

function isNamedBrowserRegistration(node: ts.Node, name: string): boolean {
  return (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
  );
}

function readBrowserModuleUsage(
  ast: ts.SourceFile,
  expected: Readonly<{ path: string; owner: string; target: string; registerName: string }>
): { referenced: boolean; registrations: number } {
  let referenced = false;
  let registrations = 0;
  const visit = (node: ts.Node): void => {
    if (expected.path === expected.owner && isNamedBrowserRegistration(node, expected.registerName))
      registrations++;
    if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
      const imported = resolve(dirname(expected.path), node.text);
      if ([imported, `${imported}.ts`].includes(expected.target)) referenced = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return { referenced, registrations };
}

function registerColumnViewBrowserCoverage(): void {
  describe('column view browser coverage', () => {
    it.each(columnViewSourcePaths)('retains both obligations for %s', (source) => {
      const plan = resolveWebVitestChangedSuitePlan([source]);
      expect(plan.browserCommands).toEqual([liveCommand]);
      expect(plan.browserCommands[0]?.specPaths).toEqual(
        expect.arrayContaining(columnViewBrowserSpecs)
      );
      expect(resolveWebCypressChangedPlan([source]).vitestFiles).toEqual([source]);
    });

    it('deduplicates mixed browser evidence while retaining only the product paths in Vitest', () => {
      const files = [...columnViewSourcePaths, ...columnViewBrowserSpecs, ...columnViewSourcePaths];
      const plan = resolveWebVitestChangedSuitePlan(files);
      expect(plan.browserCommands).toEqual([liveCommand]);
      expect(plan.browserCommands[0]?.specPaths).toEqual(liveCommand.specPaths);
      expect(new Set(plan.browserCommands[0]?.specPaths).size).toBe(liveCommand.specPaths.length);
      expect(resolveWebCypressChangedPlan(files).vitestFiles).toEqual(columnViewSourcePaths);
      expect(plan.commandPlan).toEqual(
        resolveWebVitestChangedSuitePlan(columnViewSourcePaths).commandPlan
      );
    });
  });
}

export function registerBrowserRoutingSurfaces(): void {
  registerColumnViewBrowserCoverage();
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
        const usage = readBrowserModuleUsage(ast, {
          path,
          owner: resolve(owner.slice('apps/web/'.length)),
          target,
          registerName,
        });
        registrations += usage.registrations;
        if (usage.referenced) consumers.add(path);
      }
      expect([...consumers]).toEqual([resolve(owner.slice('apps/web/'.length))]);
      expect(registrations).toBe(1);
    });
  });
}
