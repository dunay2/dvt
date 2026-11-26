// @vitest-environment node
/**
 * Owned concern: browser helper closure admission.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveWebCypressChangedPlan,
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_SPECS,
} from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingFixtureClosure(): void {
  registerBrowserRoutingSupportAdmission();
  describe('browser helper closure admission', () => {
    it.each(
      ['apps/web/cypress.commands.ts', 'apps/web/cypress.supportCapabilities.ts'].flatMap(
        (path) => [path, path.slice('apps/web/'.length), path.replaceAll('/', '\\')]
      )
    )('keeps browser-owner modules on complete runtime proof: %s', (path) => {
      const plan = resolveWebVitestChangedSuitePlan([path]);
      const originalOwner = resolveWebVitestChangedSuitePlan(['apps/web/cypress.changed.ts']);
      expect(plan.suites).toEqual(originalOwner.suites);
      expect(plan.commandPlan).toEqual(originalOwner.commandPlan);
      expect(plan.browserCommands.map((command) => command.capability)).toEqual([
        'controlled',
        'available',
        'unavailable',
      ]);
      for (const command of plan.browserCommands) {
        expect(command.specPaths).toEqual(WEB_CYPRESS_SPECS[command.capability]);
      }
    });
    it.each([
      'apps/web/cypress/support/canvasExecutionSelection.ts',
      'apps/web/cypress/support/canvasFirstAuthoring.ts',
      'apps/web/cypress/support/codeWorkbench/bootstrap.ts',
      'apps/web/cypress/support/modelSqlAuthoring.ts',
      'apps/web/cypress/support/dbtProjectLive.ts',
      'apps/web/cypress/support/e2eApiStub.ts',
      'apps/web/cypress/support/relationalWorkbench/geometry.ts',
      'apps/web/cypress/support/relationalWorkbench/operationMenu.ts',
      'apps/web/cypress/support/relationalWorkbench/pointer.ts',
      'apps/web/cypress/support/semanticLive/canonicalAssertions.ts',
      'apps/web/cypress/support/shellWorkbench/browserEmulation.ts',
      'apps/web/cypress/support/shellWorkbench/projectCodeReadback.ts',
      'apps/web/cypress/support/shellWorkbench/accessibilityAssertions.ts',
      'apps/web/cypress/support/shellWorkbench/viewportGeometry.ts',
      'apps/web/cypress/support/shellWorkbench/dependencyDirection.ts',
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

function collectSupportConsumers(): ReadonlyArray<readonly [string, readonly string[]]> {
  const graph = new Map(
    [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
  );
  const specs = Object.values(WEB_CYPRESS_SPECS).flat();
  return [...browserModules.keys()]
    .filter((path) => path.startsWith(resolve('cypress/support') + sep))
    .map(
      (helper) =>
        [
          `apps/web/${relative(resolve('.'), helper).replaceAll('\\', '/')}`,
          specs.filter((spec) =>
            reachesModule(graph, resolve(spec.slice('apps/web/'.length)), helper)
          ),
        ] as const
    )
    .filter(([, consumers]) => consumers.length > 0);
}

function assertAdmittedSupportConsumers(helper: string, consumers: readonly string[]): void {
  expect(consumers.length).toBeGreaterThan(0);
  const plan = resolveWebVitestChangedSuitePlan([helper]);
  expect(resolveWebCypressChangedPlan([helper]).vitestFiles).not.toContain(helper);
  expect(plan.browserFiles.filter((path) => path === helper)).toHaveLength(1);
  for (const consumer of consumers) {
    const owners = Object.entries(WEB_CYPRESS_SPECS)
      .filter(([, paths]) => paths.includes(consumer))
      .map(([capability]) => capability);
    expect(owners, consumer).toHaveLength(1);
    expect(
      plan.browserCommands.flatMap((command) =>
        command.specPaths.filter((path) => path === consumer).map(() => command.capability)
      ),
      consumer
    ).toEqual(owners);
    expect(
      plan.browserFiles.filter((path) => path === consumer),
      consumer
    ).toHaveLength(1);
  }
}

function registerBrowserRoutingSupportAdmission(): void {
  describe('complete physical browser support admission', () => {
    it.each(collectSupportConsumers())(
      'retains every actual runtime consumer of %s',
      assertAdmittedSupportConsumers
    );

    it.each([
      'apps/web/cypress/support/screenComposition/focusProofAdjacent.ts',
      'cypress/support/relationalWorkbench/joinChainAdjacent.ts',
      'apps\\web\\cypress\\support\\semanticLive\\unknownFixture.ts',
    ])('rejects unregistered adjacent helpers without borrowing ownership: %s', (path) => {
      expect(() => resolveWebVitestChangedSuitePlan([path])).toThrow(/not admitted/);
    });

    it.each([
      'apps/web/cypress/support/screenComposition/focusProof.ts',
      'cypress/support/screenComposition/narrowProof.ts',
      'apps\\web\\cypress\\support\\screenComposition\\startupProof.ts',
    ])('keeps an exact screen helper out of Vitest in every spelling: %s', (path) => {
      const browser = resolveWebCypressChangedPlan([path]);
      expect(browser.vitestFiles).toEqual([]);
      const plan = resolveWebVitestChangedSuitePlan([path]);
      expect(plan.commandPlan).toEqual([]);
      expect(plan.browserCommands).toMatchObject([
        {
          capability: 'controlled',
          specPaths: ['apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts'],
        },
      ]);
    });

    it('combines helper and product evidence without treating Cypress support as product code', () => {
      const helper = 'apps/web/cypress/support/screenComposition/focusProof.ts';
      const source = 'apps/web/src/app/views/sql/sqlWorksheetInsertions.ts';
      const product = resolveWebVitestChangedSuitePlan([source]);
      const paths = [helper, source, helper];
      const plan = resolveWebVitestChangedSuitePlan(paths);
      expect(resolveWebCypressChangedPlan(paths).vitestFiles).toEqual([source]);
      expect(plan.commandPlan).toEqual(product.commandPlan);
      expect(plan.suites).toEqual(product.suites);
      expect(plan.browserCommands).toMatchObject([
        {
          capability: 'controlled',
          specPaths: [
            'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
            'apps/web/cypress/e2e/sql/sql-worksheet.cy.ts',
          ],
        },
      ]);
      expect(resolveWebVitestChangedSuitePlan([...paths].reverse())).toEqual(plan);
    });
  });
}
