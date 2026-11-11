/**
 * @ownedConcern Validate governance-test routing and command construction for
 * the web Vitest changed-suite router.
 */
import { describe, expect, it } from 'vitest';

import { resolveWebVitestChangedSuitePlan } from '../../vitest/changedPlan';
import { WEB_VITEST_CHANGED_SUITE_COMMANDS } from '../../vitest/commands';
import { composeWebVitestCommandPlan } from '../../vitest/commands';
import type { WebVitestChangedSuiteName } from '../../vitest.suites';
import { listWebVitestFiles } from './vitestSuites.architecture.support';

const governanceTestPaths = listWebVitestFiles().filter((filePath) =>
  /^src\/testing\/vitestSuites(?:\.[^.]+)*\.architecture\.test\.ts$/.test(filePath)
);

describe('web Vitest governance-test routing', () => {
  it('composes complete coverage without changing its caller-owned obligations', () => {
    const suites = new Set<WebVitestChangedSuiteName>(['unit', 'canvas-unit']);
    const files = new Map<WebVitestChangedSuiteName, Set<string>>([
      ['canvas-unit', new Set(['src/app/views/canvas/canvasDraftScope.test.ts'])],
    ]);
    const originalFiles = new Map(files);
    const plan = composeWebVitestCommandPlan(suites, files);
    expect(plan.commands).toEqual([WEB_VITEST_CHANGED_SUITE_COMMANDS.unit]);
    expect([...suites]).toEqual(['unit', 'canvas-unit']);
    expect(files).toEqual(originalFiles);
  });

  it.each([
    'cli.test-cases',
    'comparison.test-cases',
    'fixtureClosure.test-cases',
    'fixtures',
    'gestures.test-cases',
    'helperClosure.test-cases',
    'moduleGraph',
    'ownership.test-cases',
    'partitions.test-cases',
    'retirement.test-cases',
    'runtime.test-cases',
    'runtime.test-support',
    'surfaces.test-cases',
  ])('routes browser routing helper %s to its complete owner entry', (name) => {
    const helper = `src/testing/vitestSuites.browserRouting.${name}.ts`;
    const expected = resolveWebVitestChangedSuitePlan([
      'src/testing/vitestSuites.browserRouting.architecture.test.ts',
    ]);
    expect(expected).toMatchObject({ suites: ['architecture'], requiresDependencies: false });
    for (const path of [helper, `apps/web/${helper}`, helper.replaceAll('/', '\\')]) {
      expect(resolveWebVitestChangedSuitePlan([path, path])).toEqual(expected);
    }
  });

  it.each([
    'src/testing/vitestSuites.browserRoutingAdjacent.ts',
    'src/testing/vitestSuites.browserRouting.unowned/consumer.ts',
    'src/testing/unrelated.test-support.ts',
  ])('preserves the source fallback for adjacent helper %s', (path) => {
    expect(resolveWebVitestChangedSuitePlan([path])).toMatchObject({
      suites: ['unit', 'architecture'],
      requiresDependencies: true,
    });
  });

  it('retains product obligations alongside browser routing proof helpers', () => {
    const helper = 'src/testing/vitestSuites.browserRouting.moduleGraph.ts';
    const product = 'src/app/views/canvas/CanvasShell.tsx';
    const expected = resolveWebVitestChangedSuitePlan([product]);
    expect(resolveWebVitestChangedSuitePlan([helper, product])).toEqual(expected);
    expect(resolveWebVitestChangedSuitePlan([product, helper])).toEqual(expected);
  });

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
    'apps/web/cypress.catalog.json',
    'apps/web/cypress.catalog.ts',
    'apps/web/vitest.suites.ts',
    'apps/web/vitest/runtimeConfig.ts',
    'apps/web/vitest/paths.ts',
    'apps/web/vitest/classification.ts',
    'apps/web/vitest/commands.ts',
    'apps/web/vitest/changedPlan.ts',
    'apps/web/scripts/run-vitest-changed-suites.ts',
    'apps/web/scripts/vitest-execution-partitions.ts',
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
