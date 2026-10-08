/**
 * Owned concern: validate Vitest catalog ownership and CI command wiring.
 * @baseline GH-3540: the catalog owns suites, not browser execution.
 * @decision GH-3583: preserve primary commands across separate evidence lifecycles.
 * @consequence Phased CI keeps the same configuration and full Vitest route.
 * @version 1.0.0
 */
import { readFileSync } from 'node:fs';
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
import { listWebVitestFiles, suiteMatchesFile, webRoot } from './vitestSuites.architecture.support';

afterEach(() => {
  vi.unstubAllEnvs();
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
    for (const filePath of listWebVitestFiles()) {
      const classification = classifyWebVitestFile(filePath);

      expect(classification, filePath).not.toBeNull();
      expect(classification?.primarySuites, filePath).toHaveLength(1);
      expect(WEB_VITEST_PRIMARY_SUITE_NAMES, filePath).toContain(classification?.primarySuites[0]);
    }
  });

  it('requires a browser environment for the persisted workspace-scope harness', () => {
    for (const filePath of listWebVitestFiles()) {
      if (classifyWebVitestFile(filePath)?.primarySuites[0] !== 'unit') continue;

      const source = readFileSync(resolve(webRoot, filePath), 'utf8');
      if (source.includes('installWorkspaceScopeHarness(')) {
        expect(source, filePath).toMatch(/@vitest-environment\s+jsdom/);
      }
    }
  });

  it('keeps architecture tests out of unit and presentation suites', () => {
    const architectureFiles = listWebVitestFiles().filter((filePath) =>
      filePath.includes('.architecture.test.')
    );

    expect(architectureFiles.length).toBeGreaterThan(0);

    for (const filePath of architectureFiles) {
      expect(classifyWebVitestFile(filePath)?.primarySuites, filePath).toEqual(['architecture']);
    }
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
    expect(workflow).toContain('name: Web Frontend Tests');
    const webJob = (
      load(workflow) as {
        jobs: Record<
          string,
          {
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
    const executionSteps = webJob.steps.filter(
      (step) => step.run?.includes('pnpm test:web:') && !step.run.includes('--plan')
    );
    expect(executionSteps.some((step) => step.run === 'pnpm test:web:ci')).toBe(true);
    expect(
      executionSteps.some(
        (step) =>
          step.run?.trim() ===
          "pnpm test:web:changed --phase=${{ matrix.phase }} ${{ matrix.capability && format('--browser-capability={0}', matrix.capability) || '' }}"
      )
    ).toBe(true);
    expect(
      executionSteps.some(
        (step) =>
          step.run?.trim() ===
          'pnpm test:web:changed --full --phase=browser --browser-capability=${{ matrix.capability }}'
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
      const files = listWebVitestFiles();
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

  it('bounds CI Vitest workers without removing primary suite coverage', () => {
    vi.stubEnv('DVT_CI', '1');
    vi.stubEnv('CI', '');

    const config = createWebVitestConfig('presentation');

    expect(config.test).toMatchObject({
      environment: 'jsdom',
      include: WEB_VITEST_SUITES.presentation.include,
      exclude: WEB_VITEST_SUITES.presentation.exclude,
      pool: 'forks',
      minWorkers: 1,
      maxWorkers: WEB_VITEST_CI_WORKER_COUNT,
      poolOptions: {
        forks: {
          singleFork: false,
          isolate: true,
          minForks: 1,
          maxForks: WEB_VITEST_CI_WORKER_COUNT,
          execArgv: [WEB_VITEST_CI_NODE_OPTIONS],
        },
      },
    });
  });

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
});
