/**
 * @ownedConcern Validate governance-test routing and command construction for
 * the web Vitest changed-suite router.
 */
import { describe, expect, it } from 'vitest';

import {
  resolveWebVitestChangedSuitePlan,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
} from '../../vitest.suites';

const GOVERNANCE_TEST_PATH = 'src/testing/vitestSuites.architecture.test.ts';
const GOVERNANCE_TEST_COMMAND =
  'pnpm exec vitest run --config vitest.architecture.config.ts ' + GOVERNANCE_TEST_PATH;

describe('web Vitest governance-test routing', () => {
  it('adds the governance test when suite catalog surfaces change', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/vitest.suites.ts',
        'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      ])
    ).toMatchObject({
      commands: [
        'pnpm exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
        GOVERNANCE_TEST_COMMAND,
      ],
      requiresDependencies: false,
      suites: ['canvas-presentation', 'architecture'],
    });

    for (const changedFile of [
      'apps/web/src/testing/vitestSuites.architecture.test.ts',
      'apps/web/vitest.suites.ts',
      'apps/web/scripts/run-vitest-changed-suites.ts',
      'apps/web/vitest.canvas-unit.config.ts',
      'apps/web/vitest.canvas-presentation.config.ts',
      'apps/web/vitest.canvas-architecture.config.ts',
    ]) {
      expect(resolveWebVitestChangedSuitePlan([changedFile])).toMatchObject({
        commands: [GOVERNANCE_TEST_COMMAND],
        commandPlan: [
          {
            config: 'vitest.architecture.config.ts',
            filePaths: [GOVERNANCE_TEST_PATH],
            kind: 'vitest-files',
          },
        ],
        requiresDependencies: false,
        suites: ['architecture'],
      });
    }
  });

  it('quotes exact architecture test paths without shell injection', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/testing/vitest suite; echo nope.architecture.test.ts',
      ])
    ).toMatchObject({
      commands: [
        "pnpm exec vitest run --config vitest.architecture.config.ts 'src/testing/vitest suite; echo nope.architecture.test.ts'",
      ],
      commandPlan: [
        {
          config: 'vitest.architecture.config.ts',
          filePaths: ['src/testing/vitest suite; echo nope.architecture.test.ts'],
          kind: 'vitest-files',
        },
      ],
      requiresDependencies: false,
      suites: ['architecture'],
    });
  });

  it('combines direct governance tests with other changed suites', () => {
    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/bootstrap/webAuthProjectOnboarding.architecture.test.ts',
        'apps/web/src/testing/vitestSuites.architecture.test.ts',
      ])
    ).toMatchObject({
      commands: [
        [
          'pnpm exec vitest run --config vitest.architecture.config.ts',
          'src/app/bootstrap/webAuthProjectOnboarding.architecture.test.ts',
          GOVERNANCE_TEST_PATH,
        ].join(' '),
      ],
      commandPlan: [
        {
          config: 'vitest.architecture.config.ts',
          filePaths: [
            'src/app/bootstrap/webAuthProjectOnboarding.architecture.test.ts',
            GOVERNANCE_TEST_PATH,
          ],
          kind: 'vitest-files',
        },
      ],
      requiresDependencies: false,
      suites: ['architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/testing/vitestSuites.architecture.test.ts',
        'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      ])
    ).toMatchObject({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'], GOVERNANCE_TEST_COMMAND],
      requiresDependencies: true,
      suites: ['canvas-presentation', 'architecture'],
    });
  });
});
