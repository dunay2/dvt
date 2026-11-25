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
import { isWebGlobalStylePath, isWebVitestImplementationPath } from './vitest/paths';

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
  changedFiles: readonly string[],
  catalogAdditions: readonly string[] = []
): WebCypressCommand | undefined {
  if (platform !== 'win32' && platform !== 'linux') return command;
  const native = new Set(WEB_CYPRESS_NATIVE_PLATFORMS[platform] ?? []);
  const retained = new Set([...changedFiles, ...catalogAdditions].map(repositoryPath));
  const specs = command.specPaths.filter((spec) => native.has(spec) || retained.has(spec));
  return specs.length > 0 ? buildBrowserCommand(command.capability, specs) : undefined;
}

function repositoryPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  return /^(src\/|cypress[/.]|vitest\.suites\.ts$|scripts\/run-vitest-changed-suites\.ts$)/.test(
    normalized
  )
    ? `apps/web/${normalized}`
    : normalized;
}

function browserCapabilities(path: string): readonly WebCypressCapability[] {
  const capability = CAPABILITIES.find((key) => WEB_CYPRESS_SPECS[key].includes(path));
  if (capability) return [capability];
  throw new Error(
    `Browser evidence is not admitted for ${path}; declare every affected spec and its real runtime.`
  );
}

type BrowserSourceChange = Readonly<{ path: string; filePath: string }>;

function completeBrowserBoundary({ path }: BrowserSourceChange): boolean {
  return (
    EXECUTION_BOUNDARIES.includes(path) ||
    isWebVitestImplementationPath(path) ||
    isWebGlobalStylePath(path)
  );
}

function isNightlyBrowserChange({ path }: BrowserSourceChange): boolean {
  return (
    WEB_CYPRESS_NIGHTLY_SPECS.includes(path) || path === '.github/workflows/web-canvas-nightly.yml'
  );
}

function requiresFixtureContract({ path }: BrowserSourceChange): boolean {
  return (
    ['/canvasDraft', '/liveProtected'].some((name) => path.includes(name)) ||
    ['/liveCanvasDraftAuthoring.ts', '/relationalWorkbench/scenario.ts'].some((name) =>
      path.endsWith(name)
    )
  );
}

class BrowserEvidenceSelection {
  private readonly selected = new Set<WebCypressCapability>();
  private readonly controlled = new Set<string>();
  private readonly required = new Set<string>();
  private readonly vitest = new Set<string>();
  private readonly retired = new Set<string>();
  private catalogAdditions?: readonly string[] | null;

  requireCapabilities(capabilities: readonly WebCypressCapability[], spec?: string): void {
    for (const capability of capabilities) this.selected.add(capability);
    if (!capabilities.includes('controlled')) return;
    const paths =
      spec && WEB_CYPRESS_SPECS.controlled.includes(spec) ? [spec] : WEB_CYPRESS_SPECS.controlled;
    for (const path of paths) this.controlled.add(path);
  }

  private admitCatalog(snapshots?: WebCypressCatalogSnapshots): void {
    if (this.catalogAdditions === undefined) {
      this.catalogAdditions = resolveControlledCatalogAdditions(WEB_CYPRESS_CATALOG, snapshots);
    }
    if (this.catalogAdditions === null) this.requireCapabilities(CAPABILITIES);
    else this.catalogAdditions.forEach((spec) => this.requireCapabilities(['controlled'], spec));
    this.required.add(WEB_CYPRESS_CATALOG_PATH);
    WEB_CYPRESS_NIGHTLY_SPECS.forEach((spec) => this.required.add(spec));
    this.vitest.add(WEB_CYPRESS_CATALOG_PATH);
  }

  private admitNightly(): void {
    WEB_CYPRESS_NIGHTLY_SPECS.forEach((spec) => this.required.add(spec));
    this.vitest.add('apps/web/src/testing/vitestSuites.browserNightly.architecture.test.ts');
  }

  private admitRetired(
    { path }: BrowserSourceChange,
    capabilities: readonly WebCypressCapability[]
  ): void {
    this.retired.add(path);
    this.requireCapabilities(capabilities);
    this.vitest.add('apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts');
  }

  private admitBrowserConsumer(change: BrowserSourceChange): void {
    const { path, filePath } = change;
    const coverage = SUPPORT_CAPABILITIES[path];
    this.required.add(path);
    if (!path.startsWith('apps/web/cypress/')) this.vitest.add(filePath);
    if (coverage && 'controlledSpecs' in coverage) {
      this.admitProductConsumers(coverage.controlledSpecs);
      return;
    }
    this.requireCapabilities(coverage ?? browserCapabilities(path), path);
    if (requiresFixtureContract(change)) FIXTURE_CONTRACTS.forEach((test) => this.vitest.add(test));
  }

  private admitProductConsumers(specs: readonly string[]): void {
    for (const spec of specs) {
      if (!WEB_CYPRESS_SPECS.controlled.includes(spec)) {
        throw new Error(`Controlled browser evidence is not admitted for ${spec}.`);
      }
      this.requireCapabilities(['controlled'], spec);
    }
  }

  private admitSession(): void {
    WEB_CYPRESS_SPECS.controlled
      .filter((spec) => spec.startsWith('apps/web/cypress/e2e/shell/'))
      .forEach((spec) => this.requireCapabilities(['controlled'], spec));
    this.requireCapabilities(['available', 'unavailable']);
  }

  admit(change: BrowserSourceChange, snapshots?: WebCypressCatalogSnapshots): void {
    const { path, filePath } = change;
    if (path === WEB_CYPRESS_CATALOG_PATH) return this.admitCatalog(snapshots);
    if (isNightlyBrowserChange(change)) return this.admitNightly();
    if (completeBrowserBoundary(change)) {
      this.requireCapabilities(CAPABILITIES);
      this.vitest.add(filePath);
      return;
    }
    const retired = RETIRED_SPEC_CAPABILITIES[path];
    if (retired) return this.admitRetired(change, retired);
    if (Object.hasOwn(SUPPORT_CAPABILITIES, path) || /^apps\/web\/cypress[/.]/.test(path)) {
      return this.admitBrowserConsumer(change);
    }
    if (requiresSessionBrowserEvidence(change)) this.admitSession();
    this.vitest.add(filePath);
  }

  result(): ReturnType<typeof resolveWebCypressChangedPlan> {
    const commands = CAPABILITIES.filter((capability) => this.selected.has(capability)).map(
      (capability) => {
        const specs =
          capability === 'controlled'
            ? WEB_CYPRESS_SPECS.controlled.filter((path) => this.controlled.has(path))
            : WEB_CYPRESS_SPECS[capability];
        specs.forEach((path) => this.required.add(path));
        return buildBrowserCommand(capability, specs);
      }
    );
    return {
      vitestFiles: [...this.vitest],
      commands,
      requiredFiles: [...this.required],
      retiredFiles: [...this.retired],
      ...(this.catalogAdditions === undefined ? {} : { catalogAdditions: this.catalogAdditions }),
    };
  }
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
  catalogAdditions?: readonly string[] | null;
} {
  const selection = new BrowserEvidenceSelection();
  if (full) selection.requireCapabilities(CAPABILITIES);
  for (const filePath of filePaths)
    selection.admit({ path: repositoryPath(filePath), filePath }, catalogSnapshots);
  return selection.result();
}

function requiresSessionBrowserEvidence({ path }: BrowserSourceChange): boolean {
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
