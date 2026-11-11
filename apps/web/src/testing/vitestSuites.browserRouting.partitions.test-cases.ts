// @vitest-environment node
/**
 * Owned concern: browser capability partition completeness.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { fixture, spec } from './vitestSuites.browserRouting.fixtures';

export function registerBrowserRoutingPartitions(): void {
  describe('browser capability partition completeness', () => {
    it.each([
      { flags: ['--phase=vitest'], capabilities: [], provider: false },
      {
        flags: ['--phase=browser'],
        capabilities: ['controlled', 'available', 'unavailable'],
        provider: true,
      },
      {
        flags: ['--phase=browser', '--browser-capability=controlled'],
        capabilities: ['controlled'],
        provider: false,
      },
      {
        flags: ['--phase=browser', '--browser-capability=available'],
        capabilities: ['available'],
        provider: true,
      },
      {
        flags: ['--phase=browser', '--browser-capability=unavailable'],
        capabilities: ['unavailable'],
        provider: true,
      },
    ])(
      'reports only selected browser commands and provider needs for $flags',
      ({ flags, capabilities, provider }) => {
        const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        vi.stubEnv('GITHUB_OUTPUT', 'mock-github-output');
        const plan = resolveWebVitestChangedSuitePlan([fixture]);
        main(['--plan', ...flags, '--files', fixture]);
        expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
          ...plan,
          vitestCommands: flags.includes('--phase=vitest') ? plan.commandPlan : [],
          browserCommands: plan.browserCommands.filter(({ capability }) =>
            capabilities.includes(capability)
          ),
        });
        expect(
          vi
            .mocked(appendFileSync)
            .mock.calls.map(([, data]) => String(data))
            .join('')
        ).toBe(
          `vitest_required=${flags.includes('--phase=vitest') && plan.commandPlan.length > 0}\nbrowser_required=${capabilities.length > 0}\nprovider_required=${provider}\n`
        );
        expect(spawnSync).not.toHaveBeenCalled();
      }
    );

    it('validates missing and unknown consumers outside the selected capability before filtering', async () => {
      const { existsSync: originalExists } =
        await vi.importActual<typeof import('node:fs')>('node:fs');
      const flags = ['--phase=browser', '--browser-capability=controlled'];
      vi.mocked(existsSync).mockImplementation(
        (path) =>
          resolve(String(path)) !== resolve(spec.slice('apps/web/'.length)) && originalExists(path)
      );
      for (const mode of [[], ['--plan'], ['--full']])
        expect(() => main([...mode, ...flags, '--files', fixture])).toThrow(spec);
      vi.mocked(existsSync).mockReset();
      const unknown = 'apps/web/cypress/e2e/unregistered.cy.ts';
      expect(() => main([...flags, '--files', fixture, unknown])).toThrow(unknown);
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it.each(['all', 'vitest', 'browser'])(
      'rejects unknown browser input before executing %s',
      (phase) => {
        const unknown = 'apps/web/cypress/e2e/unregistered.cy.ts';
        const args = phase === 'all' ? [] : [`--phase=${phase}`];
        expect(() => main([...args, '--files', spec, unknown])).toThrow(unknown);
        expect(spawnSync).not.toHaveBeenCalled();
      }
    );

    it('executes no unselected work and preserves the full browser baseline', () => {
      for (const args of [[], ['--phase=vitest'], ['--phase=browser']]) {
        main([...args, '--files', 'README.md']);
        expect(spawnSync).not.toHaveBeenCalled();
      }
      main(['--full', '--phase=browser', '--files', 'README.md']);
      expect(spawnSync).toHaveBeenCalledTimes(3);
      expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toEqual(
        resolveWebVitestChangedSuitePlan([], { full: true }).browserCommands.map(
          ({ command }) => command
        )
      );
      for (const capability of ['controlled', 'available', 'unavailable']) {
        vi.mocked(spawnSync).mockClear();
        main([
          '--full',
          '--phase=browser',
          `--browser-capability=${capability}`,
          '--files',
          'README.md',
        ]);
        expect(vi.mocked(spawnSync).mock.calls.map(([command]) => command)).toEqual(
          resolveWebVitestChangedSuitePlan([], { full: true })
            .browserCommands.filter((entry) => entry.capability === capability)
            .map(({ command }) => command)
        );
        vi.mocked(spawnSync).mockClear();
        main(['--phase=browser', `--browser-capability=${capability}`, '--files', 'README.md']);
        expect(spawnSync).not.toHaveBeenCalled();
      }
    });
  });
}
