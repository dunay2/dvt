// @vitest-environment node
/**
 * Owned concern: browser consumer ownership.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { liveCommand } from './vitestSuites.browserRouting.fixtures';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingOwnership(): void {
  describe('browser consumer ownership', () => {
    it('routes the real native keyboard support closure through the complete controlled baseline', () => {
      // A shared input adapter omitted from routing made otherwise admitted shell changes fail closed.
      const helperPath = 'apps/web/cypress/support/nativeKeyboard.ts';
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve('cypress/support/nativeKeyboard.ts');
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .map((path) => `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`)
        .sort();
      expect(consumers).toEqual([
        'apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-model-output-toggle.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts',
        'apps/web/cypress/e2e/runs/runs-runtime-contract.cy.ts',
        'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
        'apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts',
        'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts',
      ]);
      for (const consumer of consumers) {
        expect(
          Object.entries(WEB_CYPRESS_SPECS)
            .filter(([, paths]) => paths.includes(consumer))
            .map(([capability]) => capability),
          consumer
        ).toEqual(['controlled']);
      }
      const plan = resolveWebVitestChangedSuitePlan([helperPath]);
      expect(plan.commandPlan).toEqual([]);
      expect(plan.browserCommands).toMatchObject([
        { capability: 'controlled', specPaths: WEB_CYPRESS_SPECS.controlled },
      ]);
      expect(plan.browserFiles).toEqual([helperPath, ...WEB_CYPRESS_SPECS.controlled]);
    });

    it('admits retained shell menu consumers in their actual independent runtimes', () => {
      const controlled = 'apps/web/cypress/e2e/templates/templates-workbench.cy.ts';
      const available = 'apps/web/cypress/e2e/shell/active-project-creation-live.cy.ts';
      const controlledPlan = resolveWebVitestChangedSuitePlan([controlled]);
      expect(controlledPlan.browserCommands).toMatchObject([
        { capability: 'controlled', specPaths: [controlled] },
      ]);
      expect(resolveWebVitestChangedSuitePlan([available]).browserCommands).toEqual([liveCommand]);
      const body = browserModules.get(resolve(available.slice('apps/web/'.length)))!.getText();
      expect(body).toContain('visitWithLiveWorkspaceSession');
      expect(body).toContain('hasLiveProtectedRuntimeEnv');
      expect(body).not.toContain('liveProjectCreation');
      expect(body).not.toContain('this.skip');
    });

    it('routes all real source-import helper consumers to the available runtime', () => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve('cypress/support/liveWarehouseSourceImport.ts');
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .map((path) => `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`)
        .sort();
      expect(consumers.length).toBeGreaterThan(0);
      for (const consumer of consumers) {
        expect(
          Object.entries(WEB_CYPRESS_SPECS)
            .filter(([, paths]) => paths.includes(consumer))
            .map(([capability]) => capability),
          consumer
        ).toEqual(['available']);
      }
      for (const path of [...consumers, 'apps/web/cypress/support/liveWarehouseSourceImport.ts']) {
        expect(resolveWebVitestChangedSuitePlan([path]).browserCommands).toEqual([liveCommand]);
      }
    });

    it('admits the real project-authoring consumers in the available runtime', () => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve('cypress/support/liveProjectAuthoring.ts');
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .sort();
      const expected = [
        'canvas-dvt-join-preview-live',
        'canvas-dvt-sink-publication-live',
        'canvas-first-authoring-live',
        'canvas-graph-search-filter-live',
        'canvas-minimap-focus-live',
        'canvas-source-identity-live',
        'canvas-source-import-live-clean',
      ];
      expect(consumers).toEqual(
        expected.map((name) => resolve(`cypress/e2e/canvas/${name}.cy.ts`)).sort()
      );
      for (const name of expected) {
        const path = `apps/web/cypress/e2e/canvas/${name}.cy.ts`;
        const plan = resolveWebVitestChangedSuitePlan([path]);
        expect(
          plan.browserCommands.map((command) => command.capability),
          path
        ).toEqual(['available']);
      }
      expect(
        resolveWebVitestChangedSuitePlan([
          'apps/web/cypress/support/liveProjectAuthoring.ts',
        ]).browserCommands.map((command) => command.capability)
      ).toEqual(['available']);
    });
  });
}
