/** Owned concern: prove Artifacts exposes project files generated from Canvas workflows. */
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

function stubArtifactsWorkbenchApis(): void {
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

describe('Artifacts workspace project files', () => {
  it('shows Canvas workflow project artifacts in the Artifacts workbench', () => {
    stubArtifactsWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas/artifacts');

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall('/workspace/files/pipelines%2Fsales_pipeline.yaml', 'GET');
    waitForE2eApiCall('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET');

    cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
    cy.contains('Loaded Artifacts').should('exist');
    cy.contains('pipelines/sales_pipeline.yaml').scrollIntoView().should('be.visible');
    cy.contains('models/analytics/model_orders.sql').should('exist');
    cy.contains('executionTarget').should('exist');
    cy.contains('entrypoint').should('exist');
  });
});
