/**
 * @ownedConcern Validate governance-test routing and command construction for
 * the web Vitest changed-suite router.
 */
import { describe, expect, it } from 'vitest';

import {
  resolveWebVitestChangedSuitePlan,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
} from '../../vitest.suites';
import { listWebVitestFiles } from './vitestSuites.architecture.support';

const governanceTestPaths = listWebVitestFiles().filter((filePath) =>
  /^src\/testing\/vitestSuites(?:\.[^.]+)*\.architecture\.test\.ts$/.test(filePath)
);

describe('web Vitest governance-test routing', () => {
  it.each([
    'src/app/views/Canvas.tsx',
    'src/app/views/canvas/CanvasShell.tsx',
    'src/app/views/canvas/useCanvasCodeWorkbench.tsx',
    'src/app/lib/general.ts',
  ])('retains cross-module architecture guards for the source %s', (source) => {
    const pairedTest = source.replace(/\.(tsx?)$/, '.test.$1');
    for (const changed of [
      [source],
      [source, pairedTest],
      [source, pairedTest, 'src/app/views/canvas/CanvasShell.architecture.test.tsx'],
    ]) {
      const plan = resolveWebVitestChangedSuitePlan(changed);
      expect(plan.commands.filter((command) => command.includes('architecture'))).toEqual([
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ]);
      expect(resolveWebVitestChangedSuitePlan([...changed].reverse())).toEqual(plan);
    }
  });

  it.each([
    'apps/web/vitest.suites.ts',
    'apps/web/scripts/run-vitest-changed-suites.ts',
    'apps/web/vitest.canvas-unit.config.ts',
    'apps/web/vitest.canvas-presentation.config.ts',
    'apps/web/vitest.canvas-architecture.config.ts',
    'apps/web/package.json',
    '.github/workflows/test.yml',
    'docs/architecture/components/web/web-vitest-changed-suite-router-component.md',
  ])('runs all current guards when %s changes', (changedFile) => {
    expect(governanceTestPaths.length).toBeGreaterThan(1);
    const plan = resolveWebVitestChangedSuitePlan([changedFile]);
    expect(plan.suites).toEqual(['architecture']);
    expect(plan.commandPlan).toEqual([
      {
        kind: 'vitest-files',
        config: 'vitest.architecture.config.ts',
        filePaths: governanceTestPaths,
      },
    ]);
    expect(plan.requiresDependencies).toBe(false);
  });

  it('keeps unpaired source coverage alongside one complete governance batch', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'apps/web/vitest.suites.ts',
      'apps/web/vitest.unit.config.ts',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    ]);
    expect(plan.commandPlan).toEqual([
      { kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'] },
      { kind: 'shell', command: WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture },
    ]);
    expect(plan.requiresDependencies).toBe(true);
  });

  it('does not rerun an explicitly changed guard inside the governance batch', () => {
    const plan = resolveWebVitestChangedSuitePlan([
      'apps/web/vitest.suites.ts',
      ...governanceTestPaths.map((filePath) => `apps/web/${filePath}`),
    ]);
    expect(plan.commandPlan).toEqual([
      {
        kind: 'vitest-files',
        config: 'vitest.architecture.config.ts',
        filePaths: governanceTestPaths,
      },
    ]);
  });

  it('quotes exact architecture test paths without shell injection', () => {
    const filePath = 'src/testing/vitest suite; echo nope.architecture.test.ts';
    expect(resolveWebVitestChangedSuitePlan([`apps/web/${filePath}`])).toMatchObject({
      commands: [`pnpm exec vitest run --config vitest.architecture.config.ts '${filePath}'`],
      commandPlan: [
        { kind: 'vitest-files', config: 'vitest.architecture.config.ts', filePaths: [filePath] },
      ],
      requiresDependencies: false,
      suites: ['architecture'],
    });
  });

  it('keeps direct architecture-only edits exact without selecting every guard', () => {
    const changed = [
      'src/app/bootstrap/webAuthProjectOnboarding.architecture.test.ts',
      'src/testing/vitestSuites.architecture.test.ts',
    ];
    expect(resolveWebVitestChangedSuitePlan(changed).commandPlan).toEqual([
      { kind: 'vitest-files', config: 'vitest.architecture.config.ts', filePaths: changed },
    ]);
  });
});
