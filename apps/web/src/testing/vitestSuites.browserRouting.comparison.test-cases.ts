// @vitest-environment node
/**
 * Owned concern: browser Git comparison and exact fixture consumers.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { WEB_CYPRESS_CATALOG, WEB_CYPRESS_CATALOG_PATH } from '../../cypress.catalog';
import { WEB_CYPRESS_NIGHTLY_SPECS, WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  browserModules,
  reachesModule,
  runtimeImports,
} from './vitestSuites.browserRouting.moduleGraph';

export function registerBrowserRoutingComparison(): void {
  describe('browser Git comparison and exact fixture consumers', () => {
    it.each([
      'apps/web/cypress/support/nativeKeyboard.ts',
      'apps/web/cypress/support/relationalWorkbench/operationMenu.ts',
    ])(
      'rejects unknown support mixed with admitted evidence before filtering: %s',
      (helperPath) => {
        // Exact helper admission must never turn an adjacent unsupported input into accepted evidence.
        const unknown = helperPath.replace(/\.ts$/u, 'Unregistered.ts');
        expect(() => resolveWebVitestChangedSuitePlan([helperPath, unknown])).toThrow(unknown);
        expect(() =>
          resolveWebVitestChangedSuitePlan([helperPath, unknown], { full: true })
        ).toThrow(unknown);
        expect(() =>
          main([
            '--phase=browser',
            '--browser-capability=controlled',
            '--files',
            helperPath,
            unknown,
          ])
        ).toThrow(unknown);
        expect(spawnSync).not.toHaveBeenCalled();
      }
    );

    it('pins one Git comparison before discovery even if an alias moves before catalog reads', async () => {
      const childProcess = await import('node:child_process');
      const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      const previous = {
        ...WEB_CYPRESS_CATALOG,
        controlled: WEB_CYPRESS_SPECS.controlled.slice(0, -1),
      };
      const calls: string[][] = [];
      let discovered = false;
      vi.stubEnv('GIT_BASE', 'base-alias');
      vi.stubEnv('GIT_HEAD', 'head-alias');
      vi.spyOn(childProcess, 'execFileSync').mockImplementation((_command, args) => {
        const command = args as string[];
        calls.push(command);
        if (command[0] === 'rev-parse') {
          const ref = command.at(-1)!.replace(/\^\{commit\}$/, '');
          return `${ref === 'base-alias' ? (discovered ? 'advanced-base' : 'base-sha') : ref === 'head-alias' ? 'head-sha' : ref}\n`;
        }
        if (
          command[0] === 'diff' &&
          command.includes('--no-renames') &&
          !command.includes('--cached') &&
          command.length > 4
        ) {
          discovered = true;
          return `${WEB_CYPRESS_CATALOG_PATH}\0`;
        }
        if (command[0] === 'ls-tree') return `${WEB_CYPRESS_CATALOG_PATH}\0`;
        if (command[0] === 'show')
          return JSON.stringify(
            command[1]!.startsWith('base-sha:') ? previous : WEB_CYPRESS_CATALOG
          );
        return '';
      });

      main(['--plan', '--phase=browser', '--browser-capability=controlled']);
      const plan = JSON.parse(String(output.mock.calls[0]![0]));
      expect(plan.browserCommands).toMatchObject([
        { capability: 'controlled', specPaths: [WEB_CYPRESS_SPECS.controlled.at(-1)] },
      ]);
      expect(calls).toContainEqual([
        'diff',
        '--name-only',
        '--no-renames',
        '-z',
        'base-sha',
        'head-sha',
      ]);
      expect(calls.filter((args) => args.includes('base-alias^{commit}'))).toHaveLength(1);
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it('reconciles exact fixture consumers with disjoint, independently registered browser specs', () => {
      const graph = new Map(
        [...browserModules].map(([path, ast]) => [path, runtimeImports(path, ast)])
      );
      const specs = [...browserModules.keys()].filter((path) => path.endsWith('.cy.ts'));
      const target = resolve('cypress/support/canvasDrafts/buildCanvasAuthoringDraft.ts');
      const fixtureConsumers = specs.filter((path) => reachesModule(graph, path, target));
      const registered = [...Object.values(WEB_CYPRESS_SPECS).flat(), ...WEB_CYPRESS_NIGHTLY_SPECS];
      const registeredPhysical = new Set(
        registered.map((path) => resolve(path.slice('apps/web/'.length)))
      );
      expect(registeredPhysical.size).toBe(registered.length);
      for (const path of registeredPhysical) {
        expect(browserModules.has(path), path).toBe(true);
      }
      expect(fixtureConsumers.filter((path) => !registeredPhysical.has(path))).toEqual([]);
      for (const path of WEB_CYPRESS_SPECS.available) {
        const owner = resolve(path.slice('apps/web/'.length));
        expect(
          specs.filter((candidate) => reachesModule(graph, owner, candidate)),
          path
        ).toEqual([owner]);
      }
      expect(existsSync(resolve('cypress/e2e/canvas/canvas-selected-measures.cy.ts'))).toBe(false);

      const runtime = resolve('cypress/support/liveProtectedRuntime.ts');
      const unadmittedTransport = specs.filter(
        (path) => reachesModule(graph, path, runtime) && !registeredPhysical.has(path)
      );
      expect(unadmittedTransport).toEqual([]);
      for (const path of specs.filter((candidate) => !registeredPhysical.has(candidate))) {
        expect(() =>
          resolveWebVitestChangedSuitePlan([
            `apps/web/${path.slice(resolve('.').length + 1).replaceAll('\\', '/')}`,
          ])
        ).toThrow();
      }
    });
  });
}
