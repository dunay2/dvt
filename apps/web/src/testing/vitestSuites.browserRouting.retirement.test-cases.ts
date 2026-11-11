// @vitest-environment node
/**
 * Owned concern: browser evidence retirement.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  fixture,
  retired,
  revisitHelper,
  savedSampleHelper,
} from './vitestSuites.browserRouting.fixtures';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingRetirement(): void {
  describe('browser evidence retirement', () => {
    it.each([
      savedSampleHelper,
      revisitHelper,
      'apps/web/cypress/support/relationalWorkbench/columns.ts',
    ])('retains all real runtime groups for shared helper %s', (path) => {
      expect(
        resolveWebVitestChangedSuitePlan([path]).browserCommands.map(({ capability }) => capability)
      ).toEqual(['controlled', 'available']);
    });

    it('runs only changed controlled specs but retains the complete set for their shared fixture', () => {
      const path = WEB_CYPRESS_SPECS.controlled[0];
      if (!path) throw new Error('The controlled browser catalog must be nonempty.');
      const isolated = resolveWebVitestChangedSuitePlan([path, path]);
      expect(isolated.browserCommands).toHaveLength(1);
      expect(isolated.browserCommands[0]!.specPaths).toEqual([path]);
      expect(
        resolveWebVitestChangedSuitePlan([path, fixture]).browserCommands[0]!.specPaths
      ).toEqual(WEB_CYPRESS_SPECS.controlled);
    });

    it.each([
      'apps/web/cypress/e2e/shell/session-publication-lifecycle.cy.ts',
      'apps/web/cypress/e2e/shell/startup-stylesheet-loading.cy.ts',
      'apps/web/cypress/support/startupReadiness.ts',
      'apps/web/cypress/support/relationalWorkbench/pendingComposition.ts',
    ])('admits exact evidence at the controlled runtime for %s', (path) => {
      const plan = resolveWebVitestChangedSuitePlan([path]);
      expect(plan.commandPlan).toEqual([]);
      expect(plan.browserCommands.map(({ capability }) => capability)).toEqual(['controlled']);
      expect(plan.browserCommands[0]!.specPaths).toEqual(
        path.endsWith('.cy.ts') ? [path] : WEB_CYPRESS_SPECS.controlled
      );
    });

    it.each([
      [
        'cypress/support/startupReadiness.ts',
        [
          'cypress/e2e/shell/startup-route-readiness.cy.ts',
          'cypress/e2e/shell/startup-stylesheet-loading.cy.ts',
        ],
      ],
      [
        'cypress/support/relationalWorkbench/pendingComposition.ts',
        [
          'cypress/e2e/canvas/canvas-join-output-policies.cy.ts',
          'cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts',
        ],
      ],
    ] as const)('keeps %s scoped to its two real browser consumers', (helperPath, specPaths) => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const target = resolve(helperPath);
      const consumers = [...browserModules.keys()]
        .filter((path) => path.endsWith('.cy.ts') && reachesModule(graph, path, target))
        .sort();
      expect(consumers).toEqual(specPaths.map((path) => resolve(path)).sort());
      for (const path of specPaths) {
        expect(WEB_CYPRESS_SPECS.controlled).toContain(`apps/web/${path}`);
      }
    });

    it('admits explicit measure retirement only with its retained controlled replacement', () => {
      const path = 'apps/web/cypress/e2e/canvas/canvas-selected-measures.cy.ts';
      const plan = resolveWebVitestChangedSuitePlan([path]);
      expect(plan.suites).toEqual(['architecture']);
      expect(plan.browserCommands).toHaveLength(1);
      expect(plan.browserCommands[0]!.specPaths).toContain(
        'apps/web/cypress/e2e/canvas/canvas-measure-pipeline.cy.ts'
      );
      expect(plan.browserFiles).not.toContain(path);
      expect(existsSync(resolve(path.slice('apps/web/'.length)))).toBe(false);
    });

    it('rejects a reintroduced retired path before planning or phase selection', async () => {
      const { existsSync: originalExists } =
        await vi.importActual<typeof import('node:fs')>('node:fs');
      vi.mocked(existsSync).mockImplementation(
        (path) =>
          resolve(String(path)) === resolve(retired.slice('apps/web/'.length)) ||
          originalExists(path)
      );
      for (const flags of [
        ['--plan'],
        ['--phase=browser'],
        ['--phase=vitest'],
        ['--phase=browser', '--browser-capability=controlled'],
      ]) {
        expect(() => main([...flags, '--files', retired])).toThrow(retired);
        expect(spawnSync).not.toHaveBeenCalled();
      }
    });
  });
}
