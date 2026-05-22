/** Owned concern: prove Templates route UX for selection, validation, and preview. */
import { stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubTemplatesRouteBootstrapApis(): void {
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

describe('Templates workbench', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('blocks missing parameters and then renders generated source preview', () => {
    stubTemplatesRouteBootstrapApis();
    visitWithE2eWorkspaceSession('/templates');

    cy.get('[data-slot="app-route-error-boundary"]').should('not.exist');
    cy.get('[data-slot="route-workbench-frame"]').should('be.visible');
    cy.get('[data-slot="route-workbench-header"]').contains('Templates').should('be.visible');
    cy.contains('button', 'Snowflake Task').should('be.visible');
    cy.contains('Preview blocked').should('be.visible');
    cy.contains('Task name is required.').should('be.visible');
    cy.contains('Warehouse is required.').should('be.visible');
    cy.get('[data-slot="templates-generated-source-preview"]').should('not.exist');

    cy.get('input[name="taskName"]').clear().type('load_orders');
    cy.get('input[name="warehouse"]').clear().type('transforming_wh');
    cy.get('textarea[name="sqlBody"]').clear().type('call analytics.load_orders();');

    cy.contains('Preview ready').should('be.visible');
    cy.contains('load_orders.task.sql').should('be.visible');
    cy.get('[data-slot="templates-generated-source-preview"]')
      .should('be.visible')
      .and('contain', 'create or replace task load_orders')
      .and('contain', 'warehouse = transforming_wh')
      .and('contain', 'call analytics.load_orders();');
  });
});
