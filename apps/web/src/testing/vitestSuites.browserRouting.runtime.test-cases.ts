// @vitest-environment node
/**
 * Owned concern: browser invocation runtime isolation.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { WEB_CYPRESS_NIGHTLY_SPECS, WEB_CYPRESS_SPECS } from '../../cypress.changed';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import {
  dataHelper,
  fixture,
  formulaJourney,
  helper,
  inputMapping,
  inspectorConsumers,
  liveCommand,
  liveWorkloadConsumers,
  modelChain,
  savedSampleConsumers,
  semanticExecution,
  spec,
  transformStage,
  treeJourney,
  unavailable,
} from './vitestSuites.browserRouting.fixtures';

export function registerBrowserRoutingRuntime(): void {
  describe('browser invocation runtime isolation', () => {
    it('routes shared fixtures once per real runtime with explicit invocation-local environment', () => {
      const plan = resolveWebVitestChangedSuitePlan([fixture, fixture]);
      expect(plan.commandPlan).toEqual(
        resolveWebVitestChangedSuitePlan([
          'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.test.ts',
          'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.architecture.test.ts',
        ]).commandPlan
      );
      expect(plan.browserCommands).toMatchObject([
        {
          capability: 'controlled',
          command: expect.stringContaining('pnpm run test:e2e:native --browser chrome --spec '),
        },
        liveCommand,
        {
          capability: 'unavailable',
          command: `pnpm run test:e2e:selected-closure:live --spec ${unavailable}`,
          env: { DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'unavailable' },
          specPaths: [unavailable],
        },
      ]);
      expect(plan.browserCommands).toHaveLength(3);
      expect(plan.browserFiles).toContain(fixture);
    });

    it('runs all available specs once in one invocation and keeps unavailable separate', () => {
      const live = resolveWebVitestChangedSuitePlan([
        spec,
        'apps/web/cypress/e2e/canvas/canvas-formula-lineage-live.cy.ts',
        'apps/web/cypress/e2e/runs/run-controls-live.cy.ts',
      ]);
      expect(live.browserCommands).toHaveLength(1);
      expect(live.browserCommands[0]).toEqual(liveCommand);
      expect(live.browserFiles.filter((path) => path.endsWith('.cy.ts')).sort()).toEqual(
        [...WEB_CYPRESS_SPECS.available].sort()
      );
      expect(resolveWebVitestChangedSuitePlan([unavailable]).browserCommands).toMatchObject([
        { capability: 'unavailable', specPaths: [unavailable] },
      ]);
    });

    it('applies each browser environment without contaminating another command or the process', () => {
      vi.stubEnv('DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME', 'unavailable');
      const plan = resolveWebVitestChangedSuitePlan([fixture]);
      main(['--phase=browser', '--files', fixture]);
      expect(vi.mocked(spawnSync).mock.calls).toEqual(
        plan.browserCommands.map((entry) => [
          entry.command,
          expect.objectContaining({ env: { ...process.env, ...entry.env } }),
        ])
      );
      expect(vi.mocked(spawnSync).mock.calls[0]?.[1]).toMatchObject({
        env: { DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: undefined },
      });
      expect(process.env.DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME).toBe('unavailable');
    });

    it.each(['all', 'vitest', 'browser', 'plan'])(
      'rejects a deleted admitted spec or helper before %s can start',
      async (phase) => {
        const { existsSync: originalExists } =
          await vi.importActual<typeof import('node:fs')>('node:fs');
        for (const missing of [spec, helper, ...WEB_CYPRESS_NIGHTLY_SPECS]) {
          vi.mocked(existsSync).mockImplementation(
            (path) =>
              resolve(String(path)) !== resolve(missing.slice('apps/web/'.length)) &&
              originalExists(path)
          );
          const flags = phase === 'plan' ? ['--plan'] : phase === 'all' ? [] : [`--phase=${phase}`];
          expect(() => main([...flags, '--files', missing])).toThrow(missing);
          expect(spawnSync).not.toHaveBeenCalled();
          vi.mocked(existsSync).mockReset();
        }
      }
    );

    it.each([
      spec,
      helper,
      dataHelper,
      modelChain,
      inputMapping,
      semanticExecution,
      transformStage,
      formulaJourney,
      treeJourney,
      'apps/web/cypress/support/postgresPublicationFlow.ts',
      'apps/web/cypress/support/semanticLive/progressive.ts',
      ...liveWorkloadConsumers,
      ...savedSampleConsumers,
      ...inspectorConsumers,
      spec.replaceAll('/', '\\'),
      spec.slice('apps/web/'.length),
    ])('selects the real browser command, not Vitest, for %s', (file) => {
      expect(resolveWebVitestChangedSuitePlan([file])).toMatchObject({
        suites: [],
        commandPlan: [],
        requiresDependencies: false,
        browserCommands: [liveCommand],
      });
    });
  });
}
