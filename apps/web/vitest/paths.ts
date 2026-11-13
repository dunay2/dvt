/**
 * Owned concern: recognize normalized Web suite paths and governance surfaces.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */
import type { WebVitestFocusSuiteName } from '../vitest.suites';

export const WEB_VITEST_GOVERNANCE_TEST_PATHS = [
  'src/testing/vitestSuites.executionPartition.architecture.test.ts',
  'src/testing/vitestSuites.browserNightly.architecture.test.ts',
  'src/testing/vitestSuites.browserCatalog.architecture.test.ts',
  'src/testing/vitestSuites.browserCatalogReadiness.architecture.test.ts',
  'src/testing/vitestSuites.browserNativePlatform.architecture.test.ts',
  'src/testing/vitestSuites.catalogRetention.architecture.test.ts',
  'src/testing/vitestSuites.browserRouting.architecture.test.ts',
  'src/testing/vitestSuites.browserShards.architecture.test.ts',
  'src/testing/vitestSuites.architecture.test.ts',
  'src/testing/vitestSuites.catalog.architecture.test.ts',
  'src/testing/vitestSuites.changedFileDiscovery.architecture.test.ts',
  'src/testing/vitestSuites.changedRouting.architecture.test.ts',
  'src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts',
  'src/testing/vitestSuites.evidenceEnvironment.architecture.test.ts',
  'src/testing/vitestSuites.rawIntake.architecture.test.ts',
  'src/testing/vitestSuites.sizePolicy.architecture.test.ts',
] as const;

export function normalizeWebVitestPath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replace(/^\.?\//, '');
}

export function normalizeWebVitestChangedPath(filePath: string): string | null {
  const normalizedPath = normalizeWebVitestPath(filePath);
  if (normalizedPath.startsWith('apps/web/')) {
    return normalizedPath.slice('apps/web/'.length);
  }

  if (normalizedPath.startsWith('src/')) {
    return normalizedPath;
  }

  if (/^vitest(?:\.[a-z-]+)?\.config\.ts$/.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedPath === 'vitest.suites.ts' || normalizedPath === 'package.json') {
    return normalizedPath;
  }

  return null;
}

export function isWebVitestTestPath(filePath: string): boolean {
  return /\.(?:test|spec)\.(?:ts|tsx)$/.test(filePath);
}

export function isArchitectureTestPath(filePath: string): boolean {
  return /\.architecture\.test\.(?:ts|tsx)$/.test(filePath);
}

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
    filePath.startsWith('src/app/components/monaco/') ||
    filePath === 'src/app/views/CodeView.tsx' ||
    filePath === 'src/app/views/CodeView.test.tsx' ||
    filePath.startsWith('src/app/views/code/') ||
    filePath === 'src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx' ||
    filePath === 'src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx' ||
    filePath === 'src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts' ||
    filePath === 'src/app/views/diff/diffMonacoReviewSurface.architecture.test.ts' ||
    filePath === 'src/app/components/monaco/monacoBundleIsolation.architecture.test.ts' ||
    filePath === 'vite.manualChunks.ts' ||
    filePath === 'vite.config.ts'
  );
}

export function isShellSessionFocusPath(filePath: string): boolean {
  return (
    filePath.startsWith('src/app/components/shell/') ||
    filePath === 'src/app/components/TopAppBar.tsx' ||
    filePath === 'src/app/components/TopAppBar.test.tsx' ||
    filePath === 'src/app/components/TopAppBar.architecture.test.ts' ||
    filePath === 'src/app/services/AppServicesContext.tsx' ||
    filePath.startsWith('src/app/services/session/') ||
    filePath.startsWith('src/app/services/composition/') ||
    filePath === 'src/app/services/api/createApiClient.ts' ||
    filePath === 'src/app/services/api/createApiClient.test.ts' ||
    filePath === 'src/app/stores/sessionStore.ts' ||
    filePath === 'src/app/stores/sessionStore.test.ts' ||
    filePath === 'src/app/ports/workspaceScopeSelection.ts' ||
    filePath === 'src/testing/appServicesTestDoubles.ts' ||
    filePath === 'src/testing/runsPortDoubles.ts'
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

export function isWebVitestGovernancePath(filePath: string): boolean {
  const normalizedPath = normalizeWebVitestPath(filePath);

  return (
    isWebVitestImplementationPath(normalizedPath) ||
    normalizedPath === 'apps/web/cypress.changed.ts' ||
    normalizedPath === 'cypress.changed.ts' ||
    /^(?:apps\/web\/)?cypress\.(?:commands|supportCapabilities)\.ts$/.test(normalizedPath) ||
    /^((apps\/web\/)?)cypress\.catalog\.(json|ts)$/.test(normalizedPath) ||
    /^apps\/web\/vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    /^vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    normalizedPath === 'apps/web/scripts/run-vitest-changed-suites.ts' ||
    normalizedPath === 'scripts/run-vitest-changed-suites.ts' ||
    normalizedPath === 'apps/web/scripts/vitest-execution-partitions.ts' ||
    normalizedPath === 'scripts/vitest-execution-partitions.ts' ||
    normalizedPath === 'apps/web/package.json' ||
    normalizedPath === 'package.json' ||
    normalizedPath === '.github/workflows/test.yml' ||
    normalizedPath === 'docs/architecture/components/web/frontend-test-governance-component.md' ||
    normalizedPath ===
      'docs/architecture/components/web/web-vitest-changed-suite-router-component.md'
  );
}

export function isWebVitestImplementationPath(filePath: string): boolean {
  return /^(?:apps\/web\/)?(?:vitest\/[^/]+|scripts\/(?:changed-suite-(?:args|git)|web-evidence-environment))\.ts$/.test(
    normalizeWebVitestPath(filePath)
  );
}
