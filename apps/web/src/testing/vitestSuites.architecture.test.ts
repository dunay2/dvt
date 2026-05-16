import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WEB_VITEST_PRIMARY_SUITE_NAMES, classifyWebVitestFile } from '../../vitest.suites';

const webRoot = process.cwd();
const sourceRoot = resolve(webRoot, 'src');

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
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
    .sort();
}

function countTestCases(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return [...content.matchAll(/\b(?:it|test)(?:\.each)?\(/g)].length;
}

function countLines(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return content.split(/\r?\n/).length;
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
      focusSuites: ['canvas'],
      primarySuites: ['presentation'],
    });
    expect(classifyWebVitestFile('src/app/views/canvas/canvasWorkbenchStateModel.test.ts')).toEqual(
      {
        focusSuites: ['canvas'],
        primarySuites: ['unit'],
      }
    );
    expect(classifyWebVitestFile('src/app/views/canvas/CanvasShell.architecture.test.tsx')).toEqual(
      {
        focusSuites: ['canvas'],
        primarySuites: ['architecture'],
      }
    );
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
});
