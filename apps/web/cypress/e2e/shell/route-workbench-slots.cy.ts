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
  stubE2eJsonApi('GET', '/workspace/plugins', {
    plugins: [
      {
        id: 'backend-only',
        name: 'Backend only',
        version: '0.5.3',
        description: 'Backend service without a frontend contribution.',
        capabilities: ['run.observe'],
        enabled: true,
        permissions: [],
        backendPluginId: 'monitoring',
      },
      {
        id: 'unbound',
        name: 'Unbound catalog entry',
        version: '0.5.3',
        description: 'Catalog entry without a runtime binding.',
        capabilities: [],
        enabled: true,
        permissions: [],
      },
    ],
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
    contentSha256: 'a'.repeat(64),
    lastModified: '2026-05-04T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
}

function assertPrimaryRouteWorkbench(): void {
  cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
  cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
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
    cy.get('[data-slot="plugin-capability-row"]').should('have.length', 2);
    cy.get('[data-plugin-id="backend-only"]')
      .should('have.attr', 'data-runtime-shape', 'backend-only')
      .and('have.attr', 'data-frontend-presence', 'not-registered')
      .and('have.attr', 'data-backend-state', 'available')
      .and('have.attr', 'data-operational-state', 'ready');
    cy.get('[data-plugin-id="unbound"]')
      .should('have.attr', 'data-runtime-shape', 'unbound')
      .and('have.attr', 'data-backend-state', 'not-bound')
      .and('have.attr', 'data-operational-state', 'unbound');
    cy.get('[data-slot="plugin-local-registry-diagnostic"]').should('be.visible');
    cy.get('[data-slot="plugin-frontend-state-filter"]').select('unbound');
    cy.get('[data-slot="plugin-capability-row"]')
      .should('have.length', 1)
      .and('have.attr', 'data-plugin-id', 'unbound');

    stubRouteWorkbenchBootstrapApis();
    visitWithE2eWorkspaceSession('/admin');

    assertPrimaryRouteWorkbench();
    cy.get('[data-slot="route-workbench-header"]').contains(/Admin/).should('be.visible');
    cy.contains('button', 'Roles').click();
    cy.location('search').should('contain', 'tab=roles');
    cy.get('[data-slot="route-workbench-primary-surface"]').contains('Roles').should('be.visible');
  });

  it('keeps the contextual Code explorer left and working-tree editor primary', () => {
    stubCodeWorkbenchApis();
    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();

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
      .contains(/Synchronized|Sincronizado/)
      .should('be.visible');
    cy.get('[data-slot="route-workbench-right-panel"]').should('not.exist');
    cy.get('[data-testid="monaco-code-editor"]').should('be.visible');
  });
});
