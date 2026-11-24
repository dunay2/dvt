/** Owned concern: recognize the existing Canvas, Monaco, Shell and workspace focus contexts. */
import type { WebVitestFocusSuiteName } from '../vitest.suites';

import { isArchitectureTestPath } from './paths';

export function isCanvasFocusPath(filePath: string): boolean {
  return (
    filePath === 'src/app/views/Canvas.tsx' ||
    filePath === 'src/app/views/Canvas.test.support.tsx' ||
    /^src\/app\/views\/Canvas.*\.(?:test|spec)\.tsx$/.test(filePath) ||
    filePath.startsWith('src/app/views/canvas/') ||
    filePath.startsWith('src/app/components/canvas/') ||
    filePath.startsWith('src/app/components/inspector/')
  );
}

export function isMonacoFocusPath(filePath: string): boolean {
  return (
    [
      'src/app/views/CodeView.tsx',
      'src/app/views/CodeView.test.tsx',
      'src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx',
      'src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx',
      'src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts',
      'src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts',
      'src/app/components/monaco/monacoBundleIsolation.architecture.test.ts',
      'vite.manualChunks.ts',
      'vite.config.ts',
    ].includes(filePath) ||
    filePath.startsWith('src/app/components/monaco/') ||
    filePath.startsWith('src/app/views/code/')
  );
}

export function isShellSessionFocusPath(filePath: string): boolean {
  return (
    [
      'src/app/components/TopAppBar.tsx',
      'src/app/components/TopAppBar.test.tsx',
      'src/app/components/TopAppBar.architecture.test.ts',
      'src/app/services/AppServicesContext.tsx',
      'src/app/services/api/createApiClient.ts',
      'src/app/services/api/createApiClient.test.ts',
      'src/app/stores/sessionStore.ts',
      'src/app/stores/sessionStore.test.ts',
      'src/app/ports/workspaceScopeSelection.ts',
      'src/testing/appServicesTestDoubles.ts',
      'src/testing/runsPortDoubles.ts',
    ].includes(filePath) ||
    filePath.startsWith('src/app/components/shell/') ||
    filePath.startsWith('src/app/services/session/') ||
    filePath.startsWith('src/app/services/composition/')
  );
}

export function isWorkspaceServicesFocusPath(filePath: string): boolean {
  return filePath.startsWith('src/app/services/workspace/');
}

export function resolveCanvasChangedSuite(
  filePath: string
): Exclude<WebVitestFocusSuiteName, 'canvas'> {
  if (isArchitectureTestPath(filePath)) {
    return 'canvas-architecture';
  }

  if (filePath.endsWith('.tsx')) {
    return 'canvas-presentation';
  }

  return 'canvas-unit';
}
