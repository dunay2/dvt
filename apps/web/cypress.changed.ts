/**
 * Owned concern: assign exact browser consumers to their real runtime evidence.
 * @baseline GH-3578/GH-3593/GH-3610/GH-3622: retained consumers keep their real runtime and owned journeys.
 * @decision GH-3656: partition available evidence inside its policy; reuse the runtime command builder.
 * @consequence Unknown ownership rejects; CI shards preserve complete, disjoint spec execution.
 * @version 1.0.2
 */
import {
  resolveControlledCatalogAdditions,
  WEB_CYPRESS_CATALOG,
  WEB_CYPRESS_CATALOG_PATH,
  WEB_CYPRESS_CAPABILITIES as CAPABILITIES,
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_SPECS,
  type WebCypressCatalogSnapshots,
  type WebCypressCapability,
} from './cypress.catalog';

export {
  WEB_CYPRESS_NIGHTLY_SPECS,
  WEB_CYPRESS_SPECS,
  type WebCypressCapability,
} from './cypress.catalog';
export type WebCypressCommand = Readonly<{
  capability: WebCypressCapability;
  command: string;
  env: Readonly<Record<string, string | undefined>>;
  specPaths: readonly string[];
}>;

const SUPPORT_CAPABILITIES: Readonly<Record<string, readonly WebCypressCapability[]>> = {
  'apps/web/cypress.config.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/node/chromiumNetworkDiagnostics.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/node/chromiumNetworkProjection.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/node/chromiumNetworkEvidence.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/node/chromiumProcessObserver.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/node/linuxChromiumProcessObserver.py': ['available'],
  'apps/web/cypress/node/linuxChromiumProcessProtocol.py': ['available'],
  'apps/web/cypress/node/linuxChromiumSignalTrace.py': ['available'],
  'apps/web/cypress/node/linuxChromiumOomJournal.py': ['available'],
  'scripts/live-proof-web-runtime.cjs': ['available', 'unavailable'],
  'apps/web/cypress/support/canvasExecutionSelection.ts': [
    'controlled',
    'available',
    'unavailable',
  ],
  'apps/web/cypress/support/canvasGraphAuthoring.ts': ['controlled', 'available'],
  'apps/web/cypress/support/canvasFirstAuthoring.ts': ['available'],
  'apps/web/cypress/support/dbtProjectLive.ts': ['available'],
  'apps/web/cypress/support/e2eApiStub.ts': CAPABILITIES,
  'apps/web/cypress/support/workspaceSession.ts': CAPABILITIES,
  'apps/web/cypress/support/canvasDrafts/buildCanvasAuthoringDraft.ts': [
    'controlled',
    'available',
    'unavailable',
  ],
  'apps/web/cypress/support/canvasDrafts/columnMapping.ts': [
    'controlled',
    'available',
    'unavailable',
  ],
  'apps/web/cypress/support/canvasDrafts/dbt.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/generated.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/join.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/ordinary.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/performance.ts': [
    'controlled',
    'available',
    'unavailable',
  ],
  'apps/web/cypress/support/canvasDrafts/projection.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/scenario.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/union.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDrafts/warehouse.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/canvasDraftAuthoring.ts': ['controlled', 'available', 'unavailable'],
  'apps/web/cypress/support/startupReadiness.ts': ['controlled'],
  'apps/web/cypress/support/canvasReadyAuthoring.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/scenario.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/operatorEditor.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/navigation.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/persistence.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/columns.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/cardOutputControls.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/emptyOutputs.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/fieldSelection.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/geometry.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/pointer.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/pendingComposition.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/formulaLineageJourney.ts': [
    'controlled',
    'available',
  ],
  'apps/web/cypress/support/relationalWorkbench/transformFormulaJourney.ts': ['available'],
  'apps/web/cypress/support/relationalWorkbench/transformTreeJourney.ts': ['available'],
  'apps/web/cypress/support/semanticLive/fixture.ts': ['available'],
  'apps/web/cypress/support/semanticLive/canonicalAssertions.ts': ['available'],
  'apps/web/cypress/support/semanticLive/execution.ts': ['available'],
  'apps/web/cypress/support/semanticLive/progressive.ts': ['available'],
  'apps/web/cypress/support/liveCanvasDraftAuthoring.ts': ['available', 'unavailable'],
  'apps/web/cypress/support/liveProjectAuthoring.ts': ['available'],
  'apps/web/cypress/support/postgresPublicationFlow.ts': ['available'],
  'apps/web/cypress/support/liveWarehouseSourceImport.ts': ['available'],
  'apps/web/cypress/support/liveProtectedRuntime.ts': ['available', 'unavailable'],
  'apps/web/cypress/support/liveProtectedRequest.ts': ['available', 'unavailable'],
  'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts': ['available'],
  'apps/web/cypress/e2e/canvas/canvasNodeDataActions.proof.ts': ['available'],
};

const EXECUTION_BOUNDARIES = [
  'apps/web/cypress.changed.ts',
  'apps/web/cypress.catalog.ts',
  'apps/web/vitest.suites.ts',
  'apps/web/scripts/run-vitest-changed-suites.ts',
  '.github/workflows/test.yml',
  'scripts/run-selected-closure-live-proof.cjs',
  'scripts/run-selected-closure-cypress.cjs',
  'scripts/live-proof-process.cjs',
  'tools/ci/run-web-cypress-native.mjs',
  'tools/ci/run-web-cypress-native.test.mjs',
  'apps/api/package.json',
  'apps/api/vitest.integration.config.ts',
  'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
];

const RETIRED_SPEC_CAPABILITIES: Readonly<Record<string, readonly WebCypressCapability[]>> = {
  'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts': ['available'],
  'apps/web/cypress/e2e/canvas/canvas-selected-measures.cy.ts': ['controlled'],
  'apps/web/cypress/e2e/canvas/canvas-het1-object-file-dbt-live.cy.ts': ['available'],
  'apps/web/cypress/e2e/canvas/canvas-het2-rest-artifact-dbt-live.cy.ts': ['available'],
  'apps/web/cypress/support/het1PublicVertical.ts': ['available'],
  'apps/web/cypress/support/het1PublicRunProof.ts': ['available'],
  'apps/web/cypress/support/het1PublicFailureRecoveryProof.ts': ['available'],
  'apps/web/cypress/support/het2PublicVertical.ts': ['available'],
  'apps/web/cypress/fixtures/het1-object-file-orders.csv': ['available'],
  'apps/web/cypress/fixtures/het1-object-file-orders.manifest.json': ['available'],
  'apps/web/cypress/fixtures/het2-http-json-orders.jsonl': ['available'],
  'apps/web/cypress/fixtures/het2-http-json-orders.manifest.json': ['available'],
  'apps/web/cypress/fixtures/het2-fixture-cert.pem': ['available'],
  'apps/web/cypress/fixtures/het2-fixture-key.pem': ['available'],
};

const FIXTURE_CONTRACTS = [
  'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.test.ts',
  'apps/web/src/app/views/canvas/canvasDraftScenarioFixtures.architecture.test.ts',
];

function repositoryPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  return /^(cypress[/.]|vitest\.suites\.ts$|scripts\/run-vitest-changed-suites\.ts$)/.test(
    normalized
  )
    ? `apps/web/${normalized}`
    : normalized;
}

function buildBrowserCommand(
  capability: WebCypressCapability,
  specPaths: readonly string[]
): WebCypressCommand {
  const command =
    capability === 'controlled'
      ? `pnpm run test:e2e:native --browser chrome --spec ${specPaths.map((path) => path.slice('apps/web/'.length)).join(',')}`
      : `pnpm run test:e2e:selected-closure:live --spec ${specPaths.join(',')}`;
  return {
    capability,
    command,
    specPaths,
    env: {
      DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native',
      DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME:
        capability === 'controlled' ? undefined : capability,
    },
  };
}

export function selectWebCypressShard(
  command: WebCypressCommand,
  index?: number
): WebCypressCommand {
  if (index === undefined) return command;
  if (command.capability !== 'available') {
    throw new Error('Browser shards require the available capability.');
  }
  if (!Number.isInteger(index) || index < 1 || index > 3) {
    throw new Error('Browser shard index must be 1, 2 or 3.');
  }
  const specPaths = command.specPaths.filter((_, position) => position % 3 === index - 1);
  if (specPaths.length === 0) throw new Error('Cannot execute an empty browser shard.');
  return buildBrowserCommand(command.capability, specPaths);
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
    if (EXECUTION_BOUNDARIES.includes(path)) {
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
