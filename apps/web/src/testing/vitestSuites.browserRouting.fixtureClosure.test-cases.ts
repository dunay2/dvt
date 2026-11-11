// @vitest-environment node
/**
 * Owned concern: browser helper closure admission.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WEB_CYPRESS_NIGHTLY_SPECS, WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingFixtureClosure(): void {
  describe('browser helper closure admission', () => {
    it.each([
      'apps/web/cypress/support/canvasExecutionSelection.ts',
      'apps/web/cypress/support/canvasFirstAuthoring.ts',
      'apps/web/cypress/support/dbtProjectLive.ts',
      'apps/web/cypress/support/e2eApiStub.ts',
      'apps/web/cypress/support/relationalWorkbench/geometry.ts',
      'apps/web/cypress/support/relationalWorkbench/operationMenu.ts',
      'apps/web/cypress/support/relationalWorkbench/pointer.ts',
      'apps/web/cypress/support/semanticLive/canonicalAssertions.ts',
      'apps/web/cypress/support/workspaceSession.ts',
    ])('admits every exact shared-helper consumer in its real runtime: %s', (helperPath) => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve(helperPath.slice('apps/web/'.length));
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .map((path) => `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`)
        .sort();
      const plan = resolveWebVitestChangedSuitePlan([helperPath]);
      const expectedCapabilities = new Set<string>();
      expect(consumers.length).toBeGreaterThan(0);
      for (const consumer of consumers) {
        const owners = Object.entries(WEB_CYPRESS_SPECS)
          .filter(([, paths]) => paths.includes(consumer))
          .map(([capability]) => capability);
        if (WEB_CYPRESS_NIGHTLY_SPECS.includes(consumer)) {
          expect(owners, consumer).toEqual([]);
          expect(
            WEB_CYPRESS_NIGHTLY_SPECS.filter((path) => path === consumer),
            consumer
          ).toEqual([consumer]);
          const nightlyPlan = resolveWebVitestChangedSuitePlan([consumer]);
          expect(nightlyPlan.browserCommands, consumer).toEqual([]);
          expect(
            nightlyPlan.browserFiles.filter((path) => path === consumer),
            consumer
          ).toEqual([consumer]);
          expect(
            plan.browserCommands.flatMap((command) => command.specPaths),
            consumer
          ).not.toContain(consumer);
          continue;
        }
        expect(owners, consumer).toHaveLength(1);
        owners.forEach((owner) => expectedCapabilities.add(owner));
        const consumerPlan = resolveWebVitestChangedSuitePlan([consumer]);
        expect(
          consumerPlan.browserCommands.map((command) => command.capability),
          consumer
        ).toEqual(owners);
        for (const consumerOrHelperPlan of [consumerPlan, plan]) {
          expect(
            consumerOrHelperPlan.browserCommands.flatMap((command) =>
              command.specPaths.filter((path) => path === consumer).map(() => command.capability)
            ),
            consumer
          ).toEqual(owners);
          expect(
            consumerOrHelperPlan.browserFiles.filter((path) => path === consumer),
            consumer
          ).toEqual([consumer]);
        }
      }
      expect(plan.browserCommands.map((command) => command.capability)).toEqual(
        Object.keys(WEB_CYPRESS_SPECS).filter((capability) => expectedCapabilities.has(capability))
      );
    });

    it('admits the complete graph-authoring helper closure with exact runtime ownership', () => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve('cypress/support/canvasGraphAuthoring.ts');
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .sort();
      const expected = {
        controlled: [
          'canvas-calculated-column-authoring',
          'canvas-card-field-lifecycle',
          'canvas-geometry-performance',
          'canvas-happy-path-draggable',
          'canvas-ready-node-authoring',
        ],
        available: [
          'canvas-column-lineage-mapping',
          'canvas-dvt-join-preview-live',
          'canvas-dvt-sink-publication-live',
          'canvas-first-authoring-live',
        ],
      };
      expect(consumers).toEqual(
        Object.values(expected)
          .flat()
          .map((name) => resolve(`cypress/e2e/canvas/${name}.cy.ts`))
          .sort()
      );
      for (const [capability, names] of Object.entries(expected)) {
        for (const name of names) {
          const path = `apps/web/cypress/e2e/canvas/${name}.cy.ts`;
          expect(
            resolveWebVitestChangedSuitePlan([path]).browserCommands.map(
              (entry) => entry.capability
            ),
            path
          ).toEqual([capability]);
        }
      }
      expect(
        resolveWebVitestChangedSuitePlan([
          'apps/web/cypress/support/canvasGraphAuthoring.ts',
        ]).browserCommands.map((entry) => entry.capability)
      ).toEqual(['controlled', 'available']);
    });
  });
}
