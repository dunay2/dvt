/**
 * Owned concern: assign exact browser consumers to their real runtime evidence.
 * @baseline GH-3578/GH-3593/GH-3610/GH-3622: retained consumers keep their real runtime and owned journeys.
 * @decision GH-3765: use explicit shard index/count; local and hosted execution keep separate budgets.
 * @consequence Unknown ownership rejects; CI shards preserve complete, disjoint spec execution.
 * @version 1.0.2
 */
import {
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG,
  WEB_CYPRESS_CATALOG_PATH,
  WEB_CYPRESS_CAPABILITIES as CAPABILITIES,
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_NATIVE_PLATFORMS,
  WEB_CYPRESS_SPECS,
  type WebCypressCatalogSnapshots,
  type WebCypressCapability,
} from './cypress.catalog';
import { buildBrowserCommand, type WebCypressCommand } from './cypress.commands';
import {
  SUPPORT_CAPABILITIES,
  EXECUTION_BOUNDARIES,
  RETIRED_SPEC_CAPABILITIES,
  FIXTURE_CONTRACTS,
} from './cypress.supportCapabilities';
import { isWebVitestImplementationPath } from './vitest/paths';

export {
  selectWebCypressShard,
  type WebCypressCommand,
  type WebCypressShard,
} from './cypress.commands';
export {
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_SPECS,
  type WebCypressCapability,
} from './cypress.catalog';

export function selectWebCypressLocalReadiness(
  command: WebCypressCommand,
  platform: NodeJS.Platform,
  changedFiles: readonly string[]
): WebCypressCommand | undefined {
  if (platform !== 'win32' && platform !== 'linux') return command;
  const native = new Set(WEB_CYPRESS_NATIVE_PLATFORMS[platform] ?? []);
  const changed = new Set(changedFiles.map(repositoryPath));
  const specs = command.specPaths.filter((spec) => native.has(spec) || changed.has(spec));
  return specs.length > 0 ? buildBrowserCommand(command.capability, specs) : undefined;
}

function repositoryPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  return /^(cypress[/.]|vitest\.suites\.ts$|scripts\/run-vitest-changed-suites\.ts$)/.test(
    normalized
  )
    ? `apps/web/${normalized}`
    : normalized;
}

function browserCapabilities(path: string): readonly WebCypressCapability[] {
  const support = SUPPORT_CAPABILITIES[path];
  if (support) return support;
  const capability = CAPABILITIES.find((key) => WEB_CYPRESS_SPECS[key].includes(path));
  if (capability) return [capability];
  throw new Error(
    `Browser evidence is not admitted for ${path}; declare every affected spec and its real runtime.`
  );
}

export function resolveWebCypressChangedPlan(
  filePaths: readonly string[],
  full = false,
  catalogSnapshots?: WebCypressCatalogSnapshots
): {
  vitestFiles: string[];
  commands: WebCypressCommand[];
  requiredFiles: string[];
  retiredFiles: string[];
} {
  const selected = new Set<WebCypressCapability>();
  const controlledSpecs = new Set<string>();
  function requireCapabilities(capabilities: readonly WebCypressCapability[], path?: string): void {
    for (const capability of capabilities) {
      selected.add(capability);
      if (capability !== 'controlled') continue;
      const paths =
        path && WEB_CYPRESS_SPECS.controlled.includes(path) ? [path] : WEB_CYPRESS_SPECS.controlled;
      paths.forEach((spec) => controlledSpecs.add(spec));
    }
  }
  if (full) requireCapabilities(CAPABILITIES);
  const vitestFiles = new Set<string>();
  const requiredFiles = new Set<string>();
  const retiredFiles = new Set<string>();
  for (const filePath of filePaths) {
    const path = repositoryPath(filePath);
    if (path === WEB_CYPRESS_CATALOG_PATH) {
      const additions = resolveControlledCatalogAdditions(WEB_CYPRESS_CATALOG, catalogSnapshots);
      if (additions === null) requireCapabilities(CAPABILITIES);
      else additions.forEach((spec) => requireCapabilities(['controlled'], spec));
      requiredFiles.add(path);
      WEB_CYPRESS_NIGHTLY_SPECS.forEach((spec) => requiredFiles.add(spec));
      vitestFiles.add(path);
      continue;
    }
    if (EXECUTION_BOUNDARIES.includes(path) || isWebVitestImplementationPath(path)) {
      requireCapabilities(CAPABILITIES);
      vitestFiles.add(filePath);
      continue;
    }
    if (
      WEB_CYPRESS_NIGHTLY_SPECS.includes(path) ||
      path === '.github/workflows/web-canvas-nightly.yml'
    ) {
      WEB_CYPRESS_NIGHTLY_SPECS.forEach((spec) => requiredFiles.add(spec));
      vitestFiles.add('apps/web/src/testing/vitestSuites.browserNightly.architecture.test.ts');
      continue;
    }
    const retired = RETIRED_SPEC_CAPABILITIES[path];
    if (retired) {
      retiredFiles.add(path);
      requireCapabilities(retired);
      vitestFiles.add('apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts');
      continue;
    }
    if (
      Object.hasOwn(SUPPORT_CAPABILITIES, path) ||
      path.startsWith('apps/web/cypress/') ||
      path.startsWith('apps/web/cypress.')
    ) {
      requireCapabilities(browserCapabilities(path), path);
      requiredFiles.add(path);
      if (
        path.includes('/canvasDraft') ||
        path.includes('/liveProtected') ||
        path.endsWith('/liveCanvasDraftAuthoring.ts') ||
        path.endsWith('/relationalWorkbench/scenario.ts')
      ) {
        FIXTURE_CONTRACTS.forEach((test) => vitestFiles.add(test));
      }
      continue;
    }
    if (requiresSessionBrowserEvidence(path)) {
      WEB_CYPRESS_SPECS.controlled
        .filter((spec) => spec.startsWith('apps/web/cypress/e2e/shell/'))
        .forEach((spec) => requireCapabilities(['controlled'], spec));
      requireCapabilities(['available', 'unavailable']);
    }
    vitestFiles.add(filePath);
  }
  const orderedControlledSpecs = WEB_CYPRESS_SPECS.controlled.filter((path) =>
    controlledSpecs.has(path)
  );
  const capabilities = CAPABILITIES.filter((capability) => selected.has(capability));
  capabilities.forEach((capability) =>
    (capability === 'controlled' ? orderedControlledSpecs : WEB_CYPRESS_SPECS[capability]).forEach(
      (path) => requiredFiles.add(path)
    )
  );
  return {
    vitestFiles: [...vitestFiles],
    commands: capabilities.map((capability) =>
      buildBrowserCommand(
        capability,
        capability === 'controlled' ? orderedControlledSpecs : WEB_CYPRESS_SPECS[capability]
      )
    ),
    requiredFiles: [...requiredFiles],
    retiredFiles: [...retiredFiles],
  };
}

function requiresSessionBrowserEvidence(path: string): boolean {
  const source = path.replace(/^apps\/web\//, '');
  if (/\.(?:test|spec)(?:\.|$)|\.testSupport\./.test(source)) return false;
  return (
    source.startsWith('src/app/bootstrap/') ||
    source.startsWith('src/app/services/session/') ||
    source.startsWith('src/app/services/projectOnboarding/') ||
    source.startsWith('src/app/views/projectAdmission/') ||
    source === 'src/app/views/ProjectOnboardingView.tsx' ||
    source === 'src/app/views/ProjectOnboardingView.module.css'
  );
}
