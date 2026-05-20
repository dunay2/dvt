/**
 * @ownedConcern Validate that web Vitest suite partition semantics, changed-file
 * routing, and local command wiring stay aligned with the governed test model.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  classifyWebVitestFile,
  resolveWebVitestChangedSuitePlan,
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
  WEB_VITEST_FOCUS_SUITE_NAMES,
  WEB_VITEST_PRIMARY_SUITE_NAMES,
  WEB_VITEST_SUITES,
} from '../../vitest.suites';

const webRoot = process.cwd();
const sourceRoot = resolve(webRoot, 'src');

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = resolve(dir, entry);
    const stats = statSync(entryPath);
    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function listWebVitestFiles(): string[] {
  return listFiles(sourceRoot)
    .filter((filePath) => /\.(test|spec)\.(ts|tsx)$/.test(filePath))
    .map((filePath) => normalizePath(relative(webRoot, filePath)))
    .sort((a, b) => a.localeCompare(b));
}

function countTestCases(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return [...content.matchAll(/\b(?:it|test)(?:\.each)?\(/g)].length;
}

function countLines(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return content.split(/\r?\n/).length;
}

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(webRoot, '..', '..', relativePath), 'utf8');
}

describe('web Vitest suite partition', () => {
  it('assigns every web Vitest file to exactly one primary suite', () => {
    for (const filePath of listWebVitestFiles()) {
      const classification = classifyWebVitestFile(filePath);

      expect(classification, filePath).not.toBeNull();
      expect(classification?.primarySuites, filePath).toHaveLength(1);
      expect(WEB_VITEST_PRIMARY_SUITE_NAMES, filePath).toContain(classification?.primarySuites[0]);
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

    expect(packageJson.scripts.pretest).toBe('pnpm run test:deps');
    expect(packageJson.scripts['test:deps']).toBe(
      'node ../../scripts/skip-pretest-if-ci.cjs || pnpm --filter "@dvt/web^..." build'
    );
    expect(packageJson.scripts.test).toBe('vitest run --config vitest.config.ts');
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
    expect(workflow).toContain("pnpm -r --workspace-concurrency=4 --filter '!@dvt/web' test");
    expect(workflow).toContain('pnpm test:web:ci');
    expect(workflow).toContain('pnpm test:web:changed');
    expect(workflow).toContain(
      "github.event_name == 'pull_request' && steps.scope.outputs.web == 'true'"
    );
    expect(workflow).toContain('web-frontend-tests:');
    expect(workflow).toContain('name: Web Frontend Tests');

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

  it('routes changed web files to the smallest governed local suite command', () => {
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/canvas/CanvasToolbar.tsx'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation']],
      suites: ['canvas-presentation'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/canvas/canvasDraftScope.test.ts'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-unit']],
      suites: ['canvas-unit'],
    });

    expect(
      resolveWebVitestChangedSuitePlan([
        'apps/web/src/app/views/canvas/canvasDraftRepository.architecture.test.ts',
      ])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-architecture']],
      suites: ['canvas-architecture'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/components/monaco/MonacoCodeSurface.tsx'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
      suites: ['monaco'],
    });

    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/CodeView.tsx'])).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
      suites: ['monaco'],
    });

    expect(resolveWebVitestChangedSuitePlan(['apps/web/src/app/Root.tsx'])).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation],
      suites: ['presentation'],
    });

    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/services/runs/runsService.ts'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.unit],
      suites: ['unit'],
    });

    expect(resolveWebVitestChangedSuitePlan(['apps/web/vitest.suites.ts'])).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture],
      suites: ['architecture'],
    });
    expect(resolveWebVitestChangedSuitePlan(['apps/web/vitest.canvas-unit.config.ts'])).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture],
      suites: ['architecture'],
    });
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/vitest.canvas-presentation.config.ts'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture],
      suites: ['architecture'],
    });
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/vitest.canvas-architecture.config.ts'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture],
      suites: ['architecture'],
    });
    expect(WEB_VITEST_CHANGED_SUITE_COMMANDS).not.toHaveProperty('canvas');

    expect(resolveWebVitestChangedSuitePlan(['apps/api/src/server.ts'])).toEqual({
      commands: [],
      suites: [],
    });
  });

  it('keeps Monaco focus coverage aligned with Code workbench local models', () => {
    expect(WEB_VITEST_SUITES.monaco.include).toContain(
      'src/app/views/code/**/*.{test,spec}.{ts,tsx}'
    );
    expect(
      resolveWebVitestChangedSuitePlan(['apps/web/src/app/views/code/useCodeEditableBuffer.ts'])
    ).toEqual({
      commands: [WEB_VITEST_CHANGED_SUITE_COMMANDS.monaco],
      suites: ['monaco'],
    });
  });

  it('prevents Canvas route-state coverage from collapsing back into a god test', () => {
    const files = listWebVitestFiles();
    const splitRouteStateFiles = files.filter((filePath) =>
      /^src\/app\/views\/Canvas\.routeStates\.[a-z-]+\.test\.tsx$/.test(filePath)
    );

    expect(files).not.toContain('src/app/views/Canvas.routeStates.test.tsx');
    expect(splitRouteStateFiles.length).toBeGreaterThanOrEqual(4);

    for (const filePath of splitRouteStateFiles) {
      expect(countTestCases(filePath), filePath).toBeLessThanOrEqual(8);
      expect(countLines(filePath), filePath).toBeLessThanOrEqual(350);
    }
  });

  it('keeps Canvas route-level presentation tests small enough for local review', () => {
    const routeLevelPresentationFiles = listWebVitestFiles().filter((filePath) =>
      /^src\/app\/views\/Canvas\.(?!architecture\.).*\.test\.tsx$/.test(filePath)
    );

    expect(routeLevelPresentationFiles.length).toBeGreaterThan(0);

    for (const filePath of routeLevelPresentationFiles) {
      expect(countTestCases(filePath), filePath).toBeLessThanOrEqual(8);
      expect(countLines(filePath), filePath).toBeLessThanOrEqual(350);
    }
  });

  it('prevents Canvas startup and draft recovery architecture from collapsing back into one file', () => {
    const files = listWebVitestFiles();

    expect(files).not.toContain(
      'src/app/views/canvas/canvasStartupAndDraftRecovery.architecture.test.ts'
    );
    expect(files).toEqual(
      expect.arrayContaining([
        'src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts',
        'src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts',
        'src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts',
      ])
    );
  });

  it('documents the governed web test boundary as a semantic component', () => {
    const suiteCatalog = readFileSync(resolve(webRoot, 'vitest.suites.ts'), 'utf8');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/frontend-test-governance-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/frontend-test-governance-user-stories.md'
    );
    const mailboxAnalysis = readRepoFile(
      'buzon/20260518-f14-fowler-frontend-test-governance-analysis.md'
    );
    const webIndex = readRepoFile('docs/architecture/components/web/index.md');

    expect(suiteCatalog).toMatch(/^\/\*\*\s*\n \* @ownedConcern Own the web Vitest suite catalog/);
    expect(componentGuide).toContain('Public API');
    expect(componentGuide).toContain('Invariants');
    expect(componentGuide).toContain('Transitions');
    expect(componentGuide).toContain('Consumers');
    expect(componentGuide).toContain('WebVitestSuiteCatalog');
    expect(webIndex).toContain('Web Vitest changed suite router component');
    expect(userStories).toContain('F-14');
    expect(mailboxAnalysis).toContain('Fowler Analysis');
    expect(webIndex).toContain('Frontend test governance component');
  });
});
