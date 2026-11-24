/**
 * Owned concern: recognize normalized Web suite paths and governance surfaces.
 * @baseline GH-3765: one module mixed catalog, runtime and plan policies.
 * @decision Keep one owner per reason to change and reuse the existing rails.
 * @consequence Consumers import the real owner without compatibility re-exports.
 */

export const WEB_VITEST_GOVERNANCE_TEST_PATHS = [
  'src/testing/vitestSuites.impact.architecture.test.ts',
  'src/testing/vitestSuites.impactAcquisition.architecture.test.ts',
  'src/testing/vitestSuites.exactFilterExecution.architecture.test.ts',
  'src/testing/vitestSuites.testSourceOwnership.architecture.test.ts',
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
  'src/testing/vitestSuites.globalStyles.architecture.test.ts',
  'src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts',
  'src/testing/vitestSuites.evidenceEnvironment.architecture.test.ts',
  'src/testing/vitestSuites.rawIntake.architecture.test.ts',
  'src/testing/vitestSuites.sizePolicy.architecture.test.ts',
] as const;

export const WEB_VITEST_TEST_SOURCE_OWNERSHIP_GUARD_PATH =
  'src/testing/vitestSuites.testSourceOwnership.architecture.test.ts';

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

/** Global assets affect every view; deleted paths still carry their proof obligation. */
export function isWebGlobalStylePath(filePath: string): boolean {
  const normalized = normalizeWebVitestChangedPath(filePath);
  return normalized?.startsWith('src/styles/') === true && normalized.endsWith('.css');
}

export function isArchitectureTestPath(filePath: string): boolean {
  return /\.architecture\.test\.(?:ts|tsx)$/.test(filePath);
}

export function isWebVitestGovernancePath(filePath: string): boolean {
  const normalizedPath = normalizeWebVitestPath(filePath);

  return (
    [
      'apps/web/cypress.changed.ts',
      'cypress.changed.ts',
      'apps/web/scripts/run-vitest-changed-suites.ts',
      'scripts/run-vitest-changed-suites.ts',
      'apps/web/scripts/vitest-execution-partitions.ts',
      'scripts/vitest-execution-partitions.ts',
      'apps/web/package.json',
      'package.json',
      '.github/workflows/test.yml',
      'docs/architecture/components/web/frontend-test-governance-component.md',
    ].includes(normalizedPath) ||
    isWebVitestImplementationPath(normalizedPath) ||
    /^(?:apps\/web\/)?cypress\.(?:commands|supportCapabilities)\.ts$/.test(normalizedPath) ||
    /^((apps\/web\/)?)cypress\.catalog\.(json|ts)$/.test(normalizedPath) ||
    /^apps\/web\/vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    /^vitest(?:\.suites|(?:\.[a-z-]+)?\.config)\.ts$/.test(normalizedPath) ||
    normalizedPath ===
      'docs/architecture/components/web/web-vitest-changed-suite-router-component.md'
  );
}

export function isWebVitestImplementationPath(filePath: string): boolean {
  return /^(?:apps\/web\/)?(?:vitest\/[^/]+|scripts\/(?:changed-suite-(?:args|git|impact)|web-evidence-environment))\.ts$/.test(
    normalizeWebVitestPath(filePath)
  );
}
