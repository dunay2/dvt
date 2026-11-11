// @vitest-environment node
/**
 * Owned concern: routing CLI phase composition.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/run-vitest-changed-suites';
import { parseChangedSuiteArgs } from '../../scripts/changed-suite-args';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { fixture, helper, liveCommand, spec } from './vitestSuites.browserRouting.fixtures';

export function registerBrowserRoutingCli(): void {
  describe('routing CLI phase composition', () => {
    it('admits explicit plans but rejects ambiguous or coverage-dropping CLI modes', () => {
      expect(parseChangedSuiteArgs(['--plan', '--full'])).toMatchObject({ plan: true, full: true });
      expect(parseChangedSuiteArgs([])).toMatchObject({ phase: 'all' });
      expect(parseChangedSuiteArgs(['--phase=vitest'])).toMatchObject({ phase: 'vitest' });
      expect(parseChangedSuiteArgs(['--full', '--phase=browser'])).toMatchObject({
        full: true,
        phase: 'browser',
      });
      expect(parseChangedSuiteArgs(['--files', spec])).toMatchObject({ files: [spec] });
      for (const browserCapability of ['controlled', 'available', 'unavailable']) {
        expect(
          parseChangedSuiteArgs([`--browser-capability=${browserCapability}`, '--phase=browser'])
        ).toMatchObject({ phase: 'browser', browserCapability });
      }
      for (const args of [
        ['--browser-only'],
        ['--full', '--browser-only'],
        ['--phase='],
        ['--phase=unknown'],
        ['--phase=all'],
        ['--phase=vitest', '--phase=browser'],
        ['--phase=browser', '--phase=browser'],
        ['--full', '--phase=vitest'],
        ['--unknown'],
        ['--files'],
        ['--full'],
        ['--full', '--full'],
        ['--browser-capability=available'],
        ['--phase=vitest', '--browser-capability=available'],
        ['--phase=browser', '--browser-capability='],
        ['--phase=browser', '--browser-capability=unknown'],
        ['--phase=browser', '--browser-capability'],
        ['--phase=browser', '--browser-capability=available', '--browser-capability=available'],
        ['--phase=browser', '--browser-capability=available', '--browser-capability=controlled'],
      ]) {
        expect(() => parseChangedSuiteArgs(args)).toThrow();
      }
    });

    it('executes the complete mixed plan once as two disjoint phases with unchanged arguments', () => {
      const files = [
        spec,
        helper,
        'apps/web/src/lib/format.ts',
        'apps/web/src/app/views/Canvas.routeStates.smoke.test.tsx',
      ];
      const plan = resolveWebVitestChangedSuitePlan(files);
      const execute = (args: string[]): Parameters<typeof spawnSync>[] => {
        vi.mocked(spawnSync).mockClear();
        main([...args, '--files', ...files]);
        return [...vi.mocked(spawnSync).mock.calls];
      };
      const combined = execute([]);
      const vitest = execute(['--phase=vitest']);
      const browser = execute(['--phase=browser']);
      expect([...vitest, ...browser]).toEqual(combined);
      expect(vitest).toHaveLength(plan.commandPlan.length + 1);
      expect(vitest[0]?.[0]).toBe('pnpm run test:deps');
      expect(vitest.map(([command]) => command)).not.toContain(plan.browserCommands[0]!.command);
      expect(browser).toEqual([
        [
          plan.browserCommands[0]!.command,
          expect.objectContaining({
            shell: true,
            env: { ...process.env, ...liveCommand.env },
          }),
        ],
      ]);
      expect(plan.commandPlan.some((entry) => entry.kind === 'vitest-files')).toBe(true);
    });

    it('partitions all browser capabilities without omitting or duplicating a command or environment', () => {
      const files = [fixture, 'apps/web/src/lib/format.ts'];
      const execute = (flags: string[]): Parameters<typeof spawnSync>[] => {
        vi.mocked(spawnSync).mockClear();
        main([...flags, '--files', ...files]);
        return [...vi.mocked(spawnSync).mock.calls];
      };
      const complete = execute([]);
      const vitest = execute(['--phase=vitest']);
      const capabilities = ['controlled', 'available', 'unavailable'];
      const partitioned = capabilities.flatMap((capability) => {
        const calls = execute(['--phase=browser', `--browser-capability=${capability}`]);
        expect(calls).toHaveLength(1);
        return calls;
      });
      const localControlled = [1, 2, 3].flatMap((index) =>
        execute([
          '--phase=browser',
          '--browser-capability=controlled',
          `--browser-shard=${index}/3`,
        ])
      );
      const localBrowser = [...localControlled, ...partitioned.slice(1)];
      expect([...vitest, ...localBrowser]).toEqual(complete);
      expect(partitioned).toEqual(execute(['--phase=browser']));
      expect(new Set(partitioned.map(([command]) => command)).size).toBe(3);
      expect(new Set(localBrowser.map(([command]) => command)).size).toBe(5);
    });
  });
}
