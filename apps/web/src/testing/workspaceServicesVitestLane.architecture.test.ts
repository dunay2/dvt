/**
 * @ownedConcern Guard workspace-services Vitest lane wiring so web service
 * changes do not fall back to the broad unit suite.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  resolveWebVitestChangedSuitePlan,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
  WEB_VITEST_FOCUS_SUITE_NAMES,
  WEB_VITEST_SUITES,
} from '../../vitest.suites';

describe('workspace services Vitest lane', () => {
  it('declares workspace-services as a governed focus suite', () => {
    expect(WEB_VITEST_FOCUS_SUITE_NAMES).toContain('workspace-services');
    expect(WEB_VITEST_SUITES['workspace-services']).toEqual({
      include: ['src/app/services/workspace/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**'],
    });
  });

  it('keeps workspace-services package commands and config wired', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };
    const config = readFileSync(
      resolve(process.cwd(), 'vitest.workspace-services.config.ts'),
      'utf8'
    );

    expect(packageJson.scripts['test:workspace-services']).toBe(
      'pnpm run test:deps && pnpm run test:workspace-services:run'
    );
    expect(packageJson.scripts['test:workspace-services:run']).toBe(
      'vitest run --config vitest.workspace-services.config.ts'
    );
    expect(config).toContain("createWebVitestConfig('workspace-services')");
  });

  it('routes workspace service source changes to the workspace-services lane', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/services/workspace/workspacePorts.api.ts',
      ])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['workspace-services']],
      requiresDependencies: true,
      suites: ['workspace-services'],
    });
  });

  it('keeps exact workspace service test changes on exact-file execution', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/services/workspace/workspacePorts.api.test.ts',
      ])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.workspace-services.config.ts src/app/services/workspace/workspacePorts.api.test.ts',
      ],
      requiresDependencies: false,
      suites: ['workspace-services'],
    });
  });

  it('does not capture non-workspace service files', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/services/runs/runsService.ts'])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.unit],
      requiresDependencies: true,
      suites: ['unit'],
    });
  });
});
