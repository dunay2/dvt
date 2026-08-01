/** Owned concern: prove contextual Canvas Code exposes workflow project files without an Artifacts route. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eApi, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKFLOW_PROJECT_FILE_TREE = [
  {
    path: 'pipelines',
    name: 'pipelines',
    kind: 'directory',
    children: [
      {
        path: 'pipelines/sales_pipeline.yaml',
        name: 'sales_pipeline.yaml',
        kind: 'file',
      },
    ],
  },
  {
    path: 'models',
    name: 'models',
    kind: 'directory',
    children: [
      {
        path: 'models/analytics',
        name: 'analytics',
        kind: 'directory',
        children: [
          {
            path: 'models/analytics/model_orders.sql',
            name: 'model_orders.sql',
            kind: 'file',
          },
        ],
      },
    ],
  },
];

function stubContextualProjectCodeApis(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:files:view'],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    effectiveWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
  stubCanvasDraftRead();
  stubE2eJsonApi('GET', '/workspace/files', WORKFLOW_PROJECT_FILE_TREE);
  stubE2eApi('GET', '/workspace/files/pipelines%2Fsales_pipeline.yaml', () => ({
    body: {
      path: 'pipelines/sales_pipeline.yaml',
      name: 'sales_pipeline.yaml',
      language: 'yaml',
      content: 'executionTarget: "postgres"\nentrypoint: "models/analytics/model_orders.sql"',
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }));
  stubE2eApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', () => ({
    body: {
      path: 'models/analytics/model_orders.sql',
      name: 'model_orders.sql',
      language: 'sql',
      content: 'select *\nfrom raw.orders',
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }));
}

describe('Contextual project Code workflow files', () => {
  it('shows workflow YAML and SQL files without opening a peer Artifacts workbench', () => {
    stubContextualProjectCodeApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'GET');

    cy.get('[data-slot="canvas-contextual-workbench"]').should('be.visible');
    cy.get('[data-workspace-path="pipelines/sales_pipeline.yaml"]').should('be.visible');
    cy.get('[data-workspace-path="models/analytics/model_orders.sql"]')
      .should('be.visible')
      .click();
    waitForE2eApiCall('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET');

    cy.contains('select *').should('exist');
    cy.location('pathname').should('eq', '/canvas');
    cy.get('[data-slot="canvas-workbench-tab-strip"]').should('not.exist');
  });
});
