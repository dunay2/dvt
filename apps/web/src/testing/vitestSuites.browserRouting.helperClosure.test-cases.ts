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

function webPath(relative: string): string {
  return resolve(relative.slice('apps/web/'.length));
}

const additionalRevisitConsumers = [
  resolve('cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts'),
  webPath(transformStage),
  webPath(treeJourney),
  webPath(formulaJourney),
  resolve('cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-dvt-postgres-connection-binding.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-formula-lineage.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-geometry-performance.cy.ts'),
  resolve('cypress/support/canvasHappyPathFileModels.ts'),
  resolve('cypress/support/canvasHappyPathPlacement.ts'),
  resolve('cypress/e2e/canvas/canvas-join-output-policies.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-model-card-materialization.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-model-composition.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-model-output-toggle.cy.ts'),
  resolve('cypress/e2e/canvas/canvas-model-sql-authoring.cy.ts'),
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
];

type ObservedHelper = { exported: string; consumers: string[] };

function recordNamedImport(
  path: string,
  statement: ts.ImportDeclaration,
  helper: ObservedHelper
): void {
  const bindings = statement.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings))
    throw new Error(`${path}: sample helpers require explicit imports`);
  if (
    bindings.elements.some(
      (binding) => (binding.propertyName ?? binding.name).text === helper.exported
    )
  ) {
    helper.consumers.push(path);
  }
}

function observeStatement(
  path: string,
  statement: ts.Statement,
  helpers: ReadonlyMap<string, ObservedHelper>
): void {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return;
  const helper = helpers.get(resolve(dirname(path), `${statement.moduleSpecifier.text}.ts`));
  if (helper) recordNamedImport(path, statement, helper);
}

function sharedHelperConsumers() {
  const samples: string[] = [];
  const revisits: string[] = [];
  const helpers = new Map([
    [webPath(savedSampleHelper), { exported: 'stubSavedWorkbenchSample', consumers: samples }],
    [webPath(revisitHelper), { exported: 'revisitWorkbenchCanvas', consumers: revisits }],
  ]);
  for (const [path, ast] of browserModules)
    for (const statement of ast.statements) observeStatement(path, statement, helpers);
  return { samples, revisits };
}

function assertAdmittedRevisitConsumers(revisits: readonly string[]): void {
  const admitted = new Set(Object.values(WEB_CYPRESS_SPECS).flat().map(webPath));
  const graph = new Map(
    [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
  );
  for (const consumer of revisits)
    expect(
      [...admitted].some((owner) => reachesModule(graph, owner, consumer)),
      consumer
    ).toBe(true);
}

function assertSingleRegistration(expected: readonly string[]): void {
  const registrations = resolveWebVitestChangedSuitePlan([fixture])
    .browserCommands.flatMap(({ specPaths }) => specPaths)
    .map(webPath);
  for (const consumer of expected)
    expect(registrations.filter((path) => path === consumer)).toHaveLength(1);
}

export function registerBrowserRoutingHelperClosure(): void {
  describe('transitive browser helper consumer closure', () => {
    it('keeps deferred and side-effect dependencies distinct from type imports', () => {
      const path = resolve('cypress/support/import-phases.ts');
      const source = [
        "import type { Options } from './types';",
        "import { type InlineOptions } from './inline-types';",
        "import { build } from './builder';",
        "import defer * as feature from './deferred';",
        "import './setup';",
      ].join('\n');
      const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);

      expect(runtimeImports(path, ast)).toEqual([
        resolve('cypress/support/builder.ts'),
        resolve('cypress/support/deferred.ts'),
        resolve('cypress/support/setup.ts'),
      ]);
    });

    it('includes every shared-helper consumer once in its admitted runtime command', () => {
      const { samples, revisits } = sharedHelperConsumers();
      const expected = savedSampleConsumers.map(webPath);
      const inputConsumers = [modelChain, inputMapping].map(webPath);
      expect(samples.sort()).toEqual(expected.sort());
      expect(revisits.sort()).toEqual(
        [...expected, ...inputConsumers, ...additionalRevisitConsumers].sort()
      );
      assertAdmittedRevisitConsumers(revisits);
      assertSingleRegistration([
        ...expected,
        ...inputConsumers,
        ...inspectorConsumers.map(webPath),
        ...liveWorkloadConsumers.map(webPath),
        webPath(transformStage),
        resolve('cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts'),
      ]);
    });
  });
}
