/**
 * Owned concern: assign exact browser consumers to their real runtime evidence.
 * @baseline GH-3578/GH-3593: fixture consumers retain their admitted runtime and owned journeys.
 * @decision Reuse three existing runtime commands with explicit paths and invocation-local environment.
 * @consequence Unknown ownership rejects; one available entry retains all its source families.
 * @version 1.0.0
 */
export type WebCypressCapability = 'controlled' | 'available' | 'unavailable';
export type WebCypressCommand = Readonly<{
  capability: WebCypressCapability;
  command: string;
  env: Readonly<Record<string, string | undefined>>;
  specPaths: readonly string[];
}>;

export const WEB_CYPRESS_SPECS = {
  controlled: [
    'apps/web/cypress/e2e/canvas/artifacts-workspace-project-files.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-authoring-field-budgets.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-card-field-lifecycle.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-card-output-save-race.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-connection-provenance.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-connection-valve.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-dbt-source-connection-binding.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-dvt-postgres-connection-binding.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-formula-lineage.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-geometry-performance.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-join-consumers.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-join-output-policies.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-measure-pipeline.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-model-card-materialization.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-model-output-toggle.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-model-session.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-pending-read-coverage.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-predicate-reopen.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-card-cancellation.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-card-detail.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-card-movement.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-layout-persistence.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-operation-chooser.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-operation-menu.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-append.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-predicates.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-selected-relation-filter.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-selected-relation-sort-fetch.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-set-persistence.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-filter-authoring.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-inspector-order.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-transform-chain.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-transform-result-target.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-unary-lifecycle.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-unsupported-substrait-inspection.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-withdrawn-input-publication.cy.ts',
    'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts',
    'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
    'apps/web/cypress/e2e/shell/project-onboarding.cy.ts',
    'apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts',
    'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts',
    'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts',
  ],
  available: [
    'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-transform-stage.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-operation-execution.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-cross.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-relational-workbench-viewport.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-sort-fetch-data-navigation.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-model-chain-fields.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-semantic-persistence-run-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-dvt-start-run-boundaries-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-formula-lineage-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-selected-filter-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-semantic-unsupported-live.cy.ts',
    'apps/web/cypress/e2e/canvas/canvas-transform-data-sample-live.cy.ts',
    'apps/web/cypress/e2e/runs/run-controls-live.cy.ts',
  ],
  unavailable: ['apps/web/cypress/e2e/canvas/canvas-dvt-runtime-unavailable-live.cy.ts'],
} as const;

const SUPPORT_CAPABILITIES: Readonly<Record<string, readonly WebCypressCapability[]>> = {
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
  'apps/web/cypress/support/relationalWorkbench/scenario.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/operatorEditor.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/navigation.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/persistence.ts': ['controlled', 'available'],
  'apps/web/cypress/support/relationalWorkbench/cardOutputControls.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/emptyOutputs.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/fieldSelection.ts': ['controlled'],
  'apps/web/cypress/support/relationalWorkbench/formulaLineageJourney.ts': [
    'controlled',
    'available',
  ],
  'apps/web/cypress/support/relationalWorkbench/transformFormulaJourney.ts': ['available'],
  'apps/web/cypress/support/relationalWorkbench/transformTreeJourney.ts': ['available'],
  'apps/web/cypress/support/semanticLive/fixture.ts': ['available'],
  'apps/web/cypress/support/semanticLive/execution.ts': ['available'],
  'apps/web/cypress/support/liveCanvasDraftAuthoring.ts': ['available', 'unavailable'],
  'apps/web/cypress/support/liveProtectedRuntime.ts': ['available', 'unavailable'],
  'apps/web/cypress/support/liveProtectedRequest.ts': ['available', 'unavailable'],
  'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts': ['available'],
  'apps/web/cypress/e2e/canvas/canvasNodeDataActions.proof.ts': ['available'],
};

const EXECUTION_BOUNDARIES = [
  'apps/web/cypress.changed.ts',
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
};

const CAPABILITIES = ['controlled', 'available', 'unavailable'] as const;
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
  controlledSpecs: readonly string[]
): WebCypressCommand {
  const specPaths =
    capability === 'available'
      ? [WEB_CYPRESS_SPECS.available[0]]
      : capability === 'controlled'
        ? controlledSpecs
        : WEB_CYPRESS_SPECS.unavailable;
  const command =
    capability === 'controlled'
      ? `pnpm run test:e2e:native --browser chrome --spec ${specPaths.map((path) => path.slice('apps/web/'.length)).join(',')}`
      : `pnpm run test:e2e:selected-closure:live${capability === 'unavailable' ? ` --spec ${specPaths[0]}` : ''}`;
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

function browserCapabilities(path: string): readonly WebCypressCapability[] {
  const support = SUPPORT_CAPABILITIES[path];
  if (support) return support;
  const capability = CAPABILITIES.find((key) =>
    (WEB_CYPRESS_SPECS[key] as readonly string[]).includes(path)
  );
  if (capability) return [capability];
  throw new Error(
    `Browser evidence is not admitted for ${path}; declare every affected spec and its real runtime.`
  );
}

export function resolveWebCypressChangedPlan(
  filePaths: readonly string[],
  full = false
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
        path && (WEB_CYPRESS_SPECS.controlled as readonly string[]).includes(path)
          ? [path]
          : WEB_CYPRESS_SPECS.controlled;
      paths.forEach((spec) => controlledSpecs.add(spec));
    }
  }
  if (full) requireCapabilities(CAPABILITIES);
  const vitestFiles = new Set<string>();
  const requiredFiles = new Set<string>();
  const retiredFiles = new Set<string>();
  for (const filePath of filePaths) {
    const path = repositoryPath(filePath);
    const retired = RETIRED_SPEC_CAPABILITIES[path];
    if (retired) {
      retiredFiles.add(path);
      requireCapabilities(retired);
      vitestFiles.add('apps/web/src/testing/vitestSuites.browserRouting.architecture.test.ts');
      continue;
    }
    if (
      path.startsWith('apps/web/cypress/') ||
      (path.startsWith('apps/web/cypress.') && path !== 'apps/web/cypress.changed.ts')
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
    if (EXECUTION_BOUNDARIES.includes(path)) requireCapabilities(CAPABILITIES);
    vitestFiles.add(filePath);
  }
  const capabilities = CAPABILITIES.filter((capability) => selected.has(capability));
  capabilities.forEach((capability) =>
    (capability === 'controlled' ? [...controlledSpecs] : WEB_CYPRESS_SPECS[capability]).forEach(
      (path) => requiredFiles.add(path)
    )
  );
  return {
    vitestFiles: [...vitestFiles],
    commands: capabilities.map((capability) =>
      buildBrowserCommand(capability, [...controlledSpecs])
    ),
    requiredFiles: [...requiredFiles],
    retiredFiles: [...retiredFiles],
  };
}
