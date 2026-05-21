/** Owned concern: prove route workbench slots render correctly in browser UX flows. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const WORKSPACE_FILE_TREE = [
  {
    path: 'models',
    name: 'models',
    kind: 'directory',
    children: [
      {
        path: 'models/staging/stg_orders.sql',
        name: 'stg_orders.sql',
        kind: 'file',
      },
    ],
  },
];

function stubRouteWorkbenchBootstrapApis(): void {
  stubShellBootstrapApis();
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
      monitoring: { available: true },
      cost: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    effectiveWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
}

function stubCodeWorkbenchApis(): void {
  stubRouteWorkbenchBootstrapApis();
  stubCanvasDraftRead();
  stubE2eJsonApi('GET', '/workspace/files', WORKSPACE_FILE_TREE);
  stubE2eJsonApi('GET', /\/workspace\/files\/.+/, {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: 'select * from orders',
    lastModified: '2026-05-04T00:00:00.000Z',
  });
}

function assertPrimaryRouteWorkbench(): void {
  cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
  cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
  cy.get('[data-slot="route-workbench-header"]').should('be.visible');
  cy.get('[data-slot="route-workbench-body"]').should('be.visible');
  cy.get('[data-slot="route-workbench-primary-surface"]').should('be.visible');
}

describe('Route workbench semantic slots', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('renders Plugins and Admin through the no-legacy primary route slot', () => {
    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/plugins');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-header"]')
      .contains(/Plugins/)
      .should('be.visible');
    cy.get('[data-slot="plugins-capability-probe"]').should('be.visible');

    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/admin');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-header"]').contains(/Admin/).should('be.visible');
    cy.contains('button', 'Roles').click();
    cy.location('search').should('contain', 'tab=roles');
    cy.get('[data-slot="route-workbench-primary-surface"]').contains('Roles').should('be.visible');
  });

  it('keeps the Code explorer in the left slot and editable buffer in the primary slot', () => {
    stubCodeWorkbenchApis();
    visitWithE2eWorkspaceSession('/canvas/code');

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-left-panel"]')
      .contains(/Explorer|Explorador/)
      .should('be.visible');
    cy.get('[data-slot="route-workbench-left-panel"]')
      .contains('stg_orders.sql')
      .should('be.visible');
    cy.get('[data-slot="route-workbench-primary-surface"]')
      .contains(/Editable local buffer|Buffer local editable/)
      .should('be.visible');
    cy.get('[data-slot="route-workbench-right-panel"]').should('not.exist');

    cy.get('[data-testid="monaco-code-editor"]').within(() => {
      cy.get('.monaco-editor textarea')
        .first()
        .focus()
        .type('{ctrl+a}select 7 as slot_verified', { force: true, delay: 0 });
    });
    cy.get('[data-slot="route-workbench-primary-surface"]')
      .contains('select 7 as slot_verified')
      .should('be.visible');
  });
});
