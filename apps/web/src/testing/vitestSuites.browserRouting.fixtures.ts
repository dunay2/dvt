// @vitest-environment node
/**
 * Owned concern: name admitted browser evidence inputs.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { WEB_CYPRESS_SPECS } from '../../cypress.changed';

export const spec = 'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';

export const helper = 'apps/web/cypress/e2e/canvas/liveRunEventRecovery.proof.ts';

export const dataHelper = 'apps/web/cypress/e2e/canvas/canvasNodeDataActions.proof.ts';

export const savedSampleHelper = 'apps/web/cypress/support/relationalWorkbench/persistence.ts';

export const revisitHelper = 'apps/web/cypress/support/relationalWorkbench/navigation.ts';

export const modelChain = 'apps/web/cypress/e2e/canvas/canvas-model-chain-fields.cy.ts';

export const inputMapping = 'apps/web/cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts';

export const semanticExecution = 'apps/web/cypress/support/semanticLive/execution.ts';

export const transformStage = 'apps/web/cypress/e2e/canvas/canvas-transform-stage.cy.ts';

export const formulaJourney =
  'apps/web/cypress/support/relationalWorkbench/transformFormulaJourney.ts';

export const treeJourney = 'apps/web/cypress/support/relationalWorkbench/transformTreeJourney.ts';

export const liveWorkloadConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-dvt-sink-publication-live.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-semantic-persistence-run-live.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-sql-progressive-live.cy.ts',
];

export const inspectorConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-relational-tree-workbench.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-removal.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-viewport.cy.ts',
];

export const savedSampleConsumers = [
  'apps/web/cypress/e2e/canvas/canvas-relational-operation-execution.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-relational-workbench-cross.cy.ts',
  'apps/web/cypress/e2e/canvas/canvas-sort-fetch-data-navigation.cy.ts',
];

export const retired = 'apps/web/cypress/e2e/canvas/canvas-node-data-actions.cy.ts';

export const fixture = 'apps/web/cypress/support/canvasDraftAuthoring.ts';

export const unavailable = 'apps/web/cypress/e2e/canvas/canvas-dvt-runtime-unavailable-live.cy.ts';

export const liveCommand = {
  capability: 'available',
  command: `pnpm run test:e2e:selected-closure:live --spec ${WEB_CYPRESS_SPECS.available.join(',')}`,
  specPaths: WEB_CYPRESS_SPECS.available,
  env: {
    DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native',
    DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'available',
  },
};
