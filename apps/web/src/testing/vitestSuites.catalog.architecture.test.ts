/**
 * Owned concern: validate Vitest catalog ownership and CI command wiring.
 * @baseline GH-3540: the catalog owns suites, not browser execution.
 * @decision GH-3583: preserve primary commands across separate evidence lifecycles.
 * @consequence Phased CI keeps the same configuration and full Vitest route.
 * @version 1.0.0
 */
import { promises as fsPromises, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  classifyWebVitestFile,
  createWebVitestConfig,
  resolveWebVitestChangedSuitePlan,
  WEB_VITEST_CI_NODE_OPTIONS,
  WEB_VITEST_CI_WORKER_COUNT,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
  WEB_VITEST_FOCUS_SUITE_NAMES,
  WEB_VITEST_PRIMARY_SUITE_NAMES,
  WEB_VITEST_SUITES,
} from '../../vitest.suites';
import {
  listWebVitestFiles,
  readArchitectureSources,
  suiteMatchesFile,
  webRoot,
} from './vitestSuites.architecture.support';

let webVitestFiles: string[] | undefined;

function readWebVitestFiles(): string[] {
  return (webVitestFiles ??= listWebVitestFiles());
}

function lacksWorkspaceScopeBrowserEnvironment(source: string): boolean {
  return (
    source.includes('installWorkspaceScopeHarness(') && !/@vitest-environment\s+jsdom/.test(source)
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('web Vitest suite catalog', () => {
  it.each(['unit', 'architecture', 'canvas-unit', 'canvas-architecture'] as const)(
    'uses Node by default for the %s suite without changing its file ownership',
    (suiteName) => {
      expect(createWebVitestConfig(suiteName).test).toMatchObject({
        environment: 'node',
        include: WEB_VITEST_SUITES[suiteName].include,
        exclude: WEB_VITEST_SUITES[suiteName].exclude,
      });
    }
  );

  it.each([
    'all',
    'presentation',
    ...WEB_VITEST_FOCUS_SUITE_NAMES.filter(
      (suiteName) => suiteName !== 'canvas-unit' && suiteName !== 'canvas-architecture'
    ),
  ] as const)('retains the browser environment for the %s suite', (suiteName) => {
    expect(createWebVitestConfig(suiteName).test?.environment).toBe('jsdom');
  });

  it('assigns every web Vitest file to exactly one primary suite', () => {
    const offenders = readWebVitestFiles().flatMap((filePath) => {
      const classification = classifyWebVitestFile(filePath);
      const primary = classification?.primarySuites[0];
      return classification?.primarySuites.length === 1 &&
        primary !== undefined &&
        WEB_VITEST_PRIMARY_SUITE_NAMES.includes(primary)
        ? []
        : [{ filePath, classification }];
    });
    expect(offenders).toEqual([]);
  });

  it('requires a browser environment for the persisted workspace-scope harness', async () => {
    const unitFiles = readWebVitestFiles()
      .filter((filePath) => classifyWebVitestFile(filePath)?.primarySuites[0] === 'unit')
      .map((filePath) => resolve(webRoot, filePath));
    const sources = await readArchitectureSources(unitFiles);
    const offenders = [...sources]
      .filter(([, source]) => lacksWorkspaceScopeBrowserEnvironment(source))
      .map(([filePath]) => filePath);
    expect(offenders).toEqual([]);
  });

  it('keeps architecture tests out of unit and presentation suites', () => {
    const architectureFiles = readWebVitestFiles().filter((filePath) =>
      filePath.includes('.architecture.test.')
    );

    expect(architectureFiles.length).toBeGreaterThan(0);

    const offenders = architectureFiles.filter((filePath) => {
      const primarySuites = classifyWebVitestFile(filePath)?.primarySuites;
      return primarySuites?.length !== 1 || primarySuites[0] !== 'architecture';
    });
    expect(offenders).toEqual([]);
  });

  it('allows Canvas focus coverage to overlap with primary suite ownership', () => {
    expect(classifyWebVitestFile('src/app/views/Canvas.routeStates.smoke.test.tsx')).toEqual({
      focusSuites: ['canvas', 'canvas-presentation'],
      primarySuites: ['presentation'],
    });
    expect(classifyWebVitestFile('src/app/views/canvas/canvasWorkbenchStateModel.test.ts')).toEqual(
      {
        focusSuites: ['canvas', 'canvas-unit'],
        primarySuites: ['unit'],
      }
    );
    expect(classifyWebVitestFile('src/app/views/canvas/CanvasShell.architecture.test.tsx')).toEqual(
      {
        focusSuites: ['canvas', 'canvas-architecture'],
        primarySuites: ['architecture'],
      }
    );
    expect(
      classifyWebVitestFile('src/app/components/canvas/DbtNodeComponent.architecture.test.ts')
    ).toEqual({
      focusSuites: ['canvas', 'canvas-architecture'],
      primarySuites: ['architecture'],
    });
    expect(
      classifyWebVitestFile('src/app/components/inspector/nodePropertiesReadModel.test.ts')
    ).toEqual({
      focusSuites: ['canvas', 'canvas-unit'],
      primarySuites: ['unit'],
    });
  });

  it('keeps suite commands, config files, and CI wired to the suite catalog', () => {
    const packageJson = JSON.parse(readFileSync(resolve(webRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const rootPackageJson = JSON.parse(
      readFileSync(resolve(webRoot, '..', '..', 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(
      resolve(webRoot, '..', '..', '.github/workflows/test.yml'),
      'utf8'
    );
    const ciWorkflow = readFileSync(
      resolve(webRoot, '..', '..', '.github/workflows/ci.yml'),
      'utf8'
    );
    const ciNodeOptionsLine = `NODE_OPTIONS: ${WEB_VITEST_CI_NODE_OPTIONS}`;

    expect(packageJson.scripts.pretest).toBe('pnpm run test:deps');
    expect(packageJson.scripts['test:deps']).toBe(
      'node ../../scripts/skip-pretest-if-ci.cjs || node ../../scripts/build-workspace-runtime-deps.cjs @dvt/web --include-package @dvt/planner'
    );
    expect(packageJson.scripts.test).toBe(
      WEB_VITEST_PRIMARY_SUITE_NAMES.map((suiteName) => `pnpm run test:${suiteName}:run`).join(
        ' && '
      )
    );
    expect(packageJson.scripts['test:ci']).toBe(
      [
        'pnpm run test:deps',
        ...WEB_VITEST_PRIMARY_SUITE_NAMES.map((suiteName) => `pnpm run test:${suiteName}:run`),
      ].join(' && ')
    );
    expect(packageJson.scripts['test:changed']).toBe(
      'pnpm exec tsx scripts/run-vitest-changed-suites.ts'
    );
    expect(rootPackageJson.scripts['test:web:changed']).toBe('pnpm --filter @dvt/web test:changed');
    expect(rootPackageJson.scripts['test:web:ci']).toBe('pnpm --filter @dvt/web test:ci');
    expect(workflow).toContain('detect_test_matrix:');
    expect(workflow).toContain('node tools/ci/emit-scope.mjs');
    expect(workflow).toContain('matrix: ${{ steps.scope.outputs.test_matrix }}');
    expect(workflow).toContain(
      "if: github.event_name != 'pull_request' || needs.detect_test_matrix.outputs.any_tests == 'true'"
    );
    expect(workflow).toContain('matrix: ${{ fromJSON(needs.detect_test_matrix.outputs.matrix) }}');
    expect(workflow).toContain('run: ${{ matrix.command }}');
    expect(workflow).toContain('pnpm test:web:ci');
    expect(workflow).toContain('web-frontend-tests:');
    const webJob = (
      load(workflow) as {
        jobs: Record<
          string,
          {
            name: string;
            env?: Record<string, string>;
            steps: Array<{
              run?: string;
              env?: Record<string, string>;
            }>;
          }
        >;
      }
    ).jobs['web-frontend-tests'];
    if (!webJob) throw new Error('Missing governed Web test job');
    expect(webJob.name).toMatch(/^Web Frontend Tests \(/);
    const executionSteps = webJob.steps.filter(
      (step) => step.run?.includes('pnpm test:web:') && !step.run.includes('--plan')
    );
    expect(executionSteps.some((step) => step.run === 'pnpm test:web:ci')).toBe(true);
    expect(
      executionSteps.some(
        (step) =>
          step.run?.trim() ===
          "pnpm test:web:changed --phase=${{ matrix.phase }} ${{ matrix.capability && format('--browser-capability={0}', matrix.capability) || '' }} ${{ matrix.shard && format('--browser-shard={0}/3', matrix.shard) || '' }}"
      )
    ).toBe(true);
    expect(
      executionSteps.some(
        (step) =>
          step.run?.trim() ===
          "pnpm test:web:changed --full --phase=browser --browser-capability=${{ matrix.capability }} ${{ matrix.shard && format('--browser-shard={0}/3', matrix.shard) || '' }}"
      )
    ).toBe(true);
    for (const step of executionSteps) {
      expect(step.env?.NODE_OPTIONS ?? webJob.env?.NODE_OPTIONS).toBe(WEB_VITEST_CI_NODE_OPTIONS);
    }
    expect(ciWorkflow).toContain(ciNodeOptionsLine);

    for (const suiteName of WEB_VITEST_PRIMARY_SUITE_NAMES) {
      expect(packageJson.scripts[`test:${suiteName}`]).toBe(
        `pnpm run test:deps && pnpm run test:${suiteName}:run`
      );
      expect(packageJson.scripts[`test:${suiteName}:run`]).toBe(
        `vitest run --config vitest.${suiteName}.config.ts`
      );
      expect(readFileSync(resolve(webRoot, `vitest.${suiteName}.config.ts`), 'utf8')).toContain(
        `createWebVitestConfig('${suiteName}')`
      );
    }

    for (const suiteName of WEB_VITEST_FOCUS_SUITE_NAMES) {
      expect(packageJson.scripts[`test:${suiteName}`]).toBe(
        `pnpm run test:deps && pnpm run test:${suiteName}:run`
      );
      expect(packageJson.scripts[`test:${suiteName}:run`]).toBe(
        `vitest run --config vitest.${suiteName}.config.ts`
      );
      expect(readFileSync(resolve(webRoot, `vitest.${suiteName}.config.ts`), 'utf8')).toContain(
        `createWebVitestConfig('${suiteName}')`
      );
    }

    expect(readFileSync(resolve(webRoot, 'vitest.config.ts'), 'utf8')).toContain(
      "createWebVitestConfig('all')"
    );
  });

  it.each(WEB_VITEST_PRIMARY_SUITE_NAMES)(
    'proves Canvas %s absorption preserves every file and execution setting',
    (primary) => {
      const focus = `canvas-${primary}` as const;
      const files = readWebVitestFiles();
      const primaryFiles = files.filter((filePath) => suiteMatchesFile(primary, filePath));
      const focusFiles = files.filter((filePath) => suiteMatchesFile(focus, filePath));
      expect(focusFiles.length).toBeGreaterThan(0);
      expect(new Set([...primaryFiles, ...focusFiles])).toEqual(new Set(primaryFiles));
      for (const ci of ['', '1']) {
        vi.stubEnv('DVT_CI', ci);
        vi.stubEnv('CI', '');
        expect(createWebVitestConfig(focus)).toEqual({
          ...createWebVitestConfig(primary),
          test: {
            ...createWebVitestConfig(primary).test,
            include: WEB_VITEST_SUITES[focus].include,
            exclude: WEB_VITEST_SUITES[focus].exclude,
          },
        });
      }
    }
  );

  it.each([
    { context: 'local', dvtCi: undefined, ci: undefined, workerCount: 4 },
    { context: 'DVT_CI', dvtCi: '1', ci: undefined, workerCount: WEB_VITEST_CI_WORKER_COUNT },
    { context: 'CI', dvtCi: undefined, ci: 'true', workerCount: WEB_VITEST_CI_WORKER_COUNT },
  ] as const)(
    'bounds $context workers without changing coverage, deadlines or inherited environment',
    ({ context, dvtCi, ci, workerCount }) => {
      vi.stubEnv('DVT_CI', dvtCi);
      vi.stubEnv('CI', ci);
      vi.stubEnv('NODE_OPTIONS', '--max-old-space-size=6144');

      for (const suiteName of [
        'all',
        ...WEB_VITEST_PRIMARY_SUITE_NAMES,
        ...WEB_VITEST_FOCUS_SUITE_NAMES,
      ] as const) {
        const config = createWebVitestConfig(suiteName).test;

        expect(config, suiteName).toMatchObject({
          include: WEB_VITEST_SUITES[suiteName].include,
          exclude: WEB_VITEST_SUITES[suiteName].exclude,
          pool: 'forks',
          minWorkers: 1,
          maxWorkers: workerCount,
          poolOptions: {
            forks: {
              singleFork: false,
              isolate: true,
              minForks: 1,
              maxForks: workerCount,
            },
          },
        });
        expect(config?.poolOptions?.forks?.execArgv, suiteName).toEqual(
          context === 'local' ? undefined : [WEB_VITEST_CI_NODE_OPTIONS]
        );
        expect(config?.testTimeout, suiteName).toBeUndefined();
        expect(config?.hookTimeout, suiteName).toBeUndefined();
        expect(config?.retry, suiteName).toBeUndefined();
      }
      expect(process.env.DVT_CI).toBe(dvtCi);
      expect(process.env.CI).toBe(ci);
      expect(process.env.NODE_OPTIONS).toBe('--max-old-space-size=6144');
    }
  );

  it('keeps Monaco focus coverage aligned with Code workbench local models', () => {
    expect(WEB_VITEST_SUITES.monaco.include).toContain(
      'src/app/views/code/**/*.{test,spec}.{ts,tsx}'
    );
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/code/useCodeEditableBuffer.ts'])
    ).toMatchObject({
      commands: [
        WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco,
        WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture,
      ],
      requiresDependencies: true,
      suites: ['monaco', 'architecture'],
    });
  });

  it('rejects persisted workspace harness sources without their browser environment', () => {
    expect(lacksWorkspaceScopeBrowserEnvironment('installWorkspaceScopeHarness()')).toBe(true);
    expect(
      lacksWorkspaceScopeBrowserEnvironment(
        '// @vitest-environment node\ninstallWorkspaceScopeHarness()'
      )
    ).toBe(true);
    expect(
      lacksWorkspaceScopeBrowserEnvironment(
        '// @vitest-environment jsdom\ninstallWorkspaceScopeHarness()'
      )
    ).toBe(false);
    expect(lacksWorkspaceScopeBrowserEnvironment('const unrelated = true')).toBe(false);
  });

  it('reads architecture sources in bounded batches while preserving input order and content', async () => {
    const paths = Array.from({ length: 65 }, (_, index) =>
      resolve(webRoot, `fixture-${65 - index}.ts`)
    );
    let activeReads = 0;
    let peakReads = 0;
    const completions: string[] = [];
    const read = vi.spyOn(fsPromises, 'readFile').mockImplementation(async (filePath) => {
      activeReads += 1;
      peakReads = Math.max(peakReads, activeReads);
      const sourcePath = String(filePath);
      for (
        let remainingTurns = 32 - (paths.indexOf(sourcePath) % 32);
        remainingTurns > 0;
        remainingTurns -= 1
      ) {
        await Promise.resolve();
      }
      activeReads -= 1;
      completions.push(sourcePath);
      return `source:${sourcePath}`;
    });

    const sources = await readArchitectureSources(paths);

    expect([...sources]).toEqual(paths.map((filePath) => [filePath, `source:${filePath}`]));
    expect(completions.slice(0, 32)).toEqual(paths.slice(0, 32).reverse());
    expect(read).toHaveBeenCalledTimes(paths.length);
    expect(peakReads).toBe(32);
    expect(activeReads).toBe(0);
    expect(await readArchitectureSources([])).toEqual(new Map());
    expect(read).toHaveBeenCalledTimes(paths.length);
  });

  it('propagates a source read failure without proceeding to another batch', async () => {
    const failure = new Error('Unreadable architecture source');
    const read = vi
      .spyOn(fsPromises, 'readFile')
      .mockResolvedValue('source')
      .mockRejectedValueOnce(failure);
    const paths = Array.from({ length: 33 }, (_, index) => resolve(webRoot, `fixture-${index}.ts`));

    await expect(readArchitectureSources(paths)).rejects.toBe(failure);

    expect(read).toHaveBeenCalledTimes(32);
  });
});
