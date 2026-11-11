// @vitest-environment node
/**
 * Owned concern: transitive browser helper consumer closure.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  fixture,
  formulaJourney,
  inputMapping,
  inspectorConsumers,
  liveWorkloadConsumers,
  modelChain,
  revisitHelper,
  savedSampleConsumers,
  savedSampleHelper,
  transformStage,
  treeJourney,
} from './vitestSuites.browserRouting.fixtures';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingHelperClosure(): void {
  describe('transitive browser helper consumer closure', () => {
    it('includes every shared-helper consumer once in its admitted runtime command', () => {
      const consumers: string[] = [];
      const revisitConsumers: string[] = [];
      const registrations = resolveWebVitestChangedSuitePlan([fixture])
        .browserCommands.flatMap(({ specPaths }) => specPaths)
        .map((path) => resolve(path.slice('apps/web/'.length)));
      const target = resolve(savedSampleHelper.slice('apps/web/'.length));
      const revisitTarget = resolve(revisitHelper.slice('apps/web/'.length));
      for (const [path, ast] of browserModules) {
        for (const statement of ast.statements) {
          if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
            continue;
          const imported = resolve(dirname(path), `${statement.moduleSpecifier.text}.ts`);
          if (imported !== target && imported !== revisitTarget) continue;
          const bindings = statement.importClause?.namedBindings;
          expect(
            bindings != null && ts.isNamedImports(bindings),
            'sample helpers require explicit imports'
          ).toBe(true);
          if (
            bindings != null &&
            ts.isNamedImports(bindings) &&
            imported === target &&
            bindings.elements.some(
              (binding) =>
                (binding.propertyName ?? binding.name).text === 'stubSavedWorkbenchSample'
            )
          )
            consumers.push(path);
          if (
            bindings != null &&
            ts.isNamedImports(bindings) &&
            imported === revisitTarget &&
            bindings.elements.some(
              (binding) => (binding.propertyName ?? binding.name).text === 'revisitWorkbenchCanvas'
            )
          )
            revisitConsumers.push(path);
        }
      }
      const expected = savedSampleConsumers.map((path) => resolve(path.slice('apps/web/'.length)));
      const inputConsumers = [modelChain, inputMapping].map((path) =>
        resolve(path.slice('apps/web/'.length))
      );
      expect(consumers.sort()).toEqual(expected.sort());
      expect(revisitConsumers.sort()).toEqual(
        [
          ...expected,
          ...inputConsumers,
          resolve('cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts'),
          resolve(transformStage.slice('apps/web/'.length)),
          resolve(treeJourney.slice('apps/web/'.length)),
          resolve(formulaJourney.slice('apps/web/'.length)),
          resolve('cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-dvt-postgres-connection-binding.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-formula-lineage.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-geometry-performance.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-join-output-policies.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-model-card-materialization.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-model-output-toggle.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-predicate-reopen.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-relational-layout-persistence.cy.ts'),
          resolve('cypress/support/canvasReadyAuthoring.ts'),
          resolve('cypress/e2e/canvas/canvas-selected-relation-filter.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-selected-relation-sort-fetch.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-set-persistence.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-source-filter-authoring.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-transform-chain.cy.ts'),
          resolve('cypress/e2e/canvas/canvas-unary-lifecycle.cy.ts'),
        ].sort()
      );
      const admitted = new Set(
        Object.values(WEB_CYPRESS_SPECS)
          .flat()
          .map((path) => resolve(path.slice('apps/web/'.length)))
      );
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      for (const consumer of revisitConsumers)
        expect(
          [...admitted].some((owner) => reachesModule(graph, owner, consumer)),
          consumer
        ).toBe(true);
      for (const consumer of [
        ...expected,
        ...inputConsumers,
        ...inspectorConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
        ...liveWorkloadConsumers.map((path) => resolve(path.slice('apps/web/'.length))),
        resolve(transformStage.slice('apps/web/'.length)),
      ])
        expect(registrations.filter((path) => path === consumer)).toHaveLength(1);
    });
  });
}
