/** Owned concern: prove canonical relational-tree inspection through the real Canvas Workbench. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-tree Workbench', () => {
  beforeEach(() => {
    stubShellBootstrapApis({
      scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubStatefulCanvasDraftAuthoring({
      substraitInnerJoin: true,
      title: 'Relational tree Workbench',
    });
  });

  it('opens one global tree in the Canvas operations drawer', () => {
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]')
      .should('contain.text', 'INNER JOIN')
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));

    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]')
      .should('contain.text', 'Relational tree')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    cy.get('[data-slot="canvas-relational-tree"]')
      .should('contain.text', 'JOIN')
      .and('contain.text', 'Left input')
      .and('contain.text', 'Right input');
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('contain.text', 'JOIN');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('contain.text', 'READ');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  });
});
