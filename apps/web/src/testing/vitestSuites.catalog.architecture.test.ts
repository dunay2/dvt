/**
 * @ownedConcern Validate web Vitest suite catalog ownership and CI command
 * wiring without mixing changed-file routing cases into the same file.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import { listWebVitestFiles, webRoot } from './vitestSuites.architecture.support';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('web Vitest suite catalog', () => {
  it.each(['unit', 'architecture'] as const)(
    'uses Node by default for the %s suite without changing its file ownership',
    (suiteName) => {
      expect(createWebVitestConfig(suiteName).test).toMatchObject({
        environment: 'node',
        include: WEB_VITEST_SUITES[suiteName].include,
        exclude: WEB_VITEST_SUITES[suiteName].exclude,
      });
    }
  );

  it.each(['all', 'presentation', ...WEB_VITEST_FOCUS_SUITE_NAMES] as const)(
    'retains the browser environment for the %s suite',
    (suiteName) => {
      expect(createWebVitestConfig(suiteName).test?.environment).toBe('jsdom');
    }
  );

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
      'node ../../scripts/skip-pretest-if-ci.cjs || pnpm --filter "@dvt/web^..." build'
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
    expect(workflow).toContain('node tools/ci/emit-test-matrix.mjs');
    expect(workflow).toContain(
      "if: github.event_name != 'pull_request' || needs.detect_test_matrix.outputs.any_tests == 'true'"
    );
    expect(workflow).toContain('matrix: ${{ fromJSON(needs.detect_test_matrix.outputs.matrix) }}');
    expect(workflow).toContain('run: ${{ matrix.command }}');
    expect(workflow).toContain('pnpm test:web:ci');
    expect(workflow).toContain('web-frontend-tests:');
    expect(workflow).toContain('name: Web Frontend Tests');
    expect(workflow.split(ciNodeOptionsLine)).toHaveLength(3);
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
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
      requiresDependencies: true,
      suites: ['monaco'],
    });
  });
});
