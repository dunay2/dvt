/**
 * @ownedConcern Keep Canvas web tests reviewable by preventing known large
 * route-state and startup coverage from collapsing back into broad files.
 */
import { describe, expect, it } from 'vitest';

import {
  countLines,
  countTestCases,
  listWebVitestFiles,
} from './vitestSuites.architecture.support';

describe('Canvas Vitest file size policy', () => {
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
});
