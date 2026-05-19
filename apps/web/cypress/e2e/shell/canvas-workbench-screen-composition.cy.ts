/** Owned concern: verify the governed Canvas entry screen chrome in browser e2e. */
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas workbench screen composition', () => {
  beforeEach(() => {
    cy.viewport(1544, 868);
    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: {
        dbt: { available: true },
        dvt: { available: true },
      },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      effectiveWorkspace: E2E_WORKSPACE_SESSION,
      availableWorkspaces: [E2E_WORKSPACE_SESSION],
    });
    stubE2eJsonApi(
      'GET',
      '/workspace/graph/draft',
      {
        error: {
          type: 'not_found',
          reason: 'workspace_graph_draft_not_found',
        },
      },
      { statusCode: 404 }
    );
  });

  it('keeps Canvas startup commands route-local and exposes global navigation in the menu', () => {
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'es-ES',
        });
        Object.defineProperty(window.navigator, 'languages', {
          configurable: true,
          value: ['es-ES'],
        });
        window.document.documentElement.lang = 'es-ES';
      },
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="app-shell-left-navigation"]').should('not.exist');
    cy.get('[data-slot="shell-top-bar"]').as('topBar');
    cy.get('@topBar').should('contain.text', 'Raven');
    cy.get('@topBar').should('contain.text', 'Vista');
    cy.get('@topBar').find('[data-slot="shell-project-identity-badge"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-workspace-context-trigger"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-git-ref"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-top-bar-canvas-controls"]').should('not.exist');
    cy.get('@topBar').should('not.contain.text', 'Plan');
    cy.get('@topBar').should('not.contain.text', 'Ejecutar');
    cy.get('@topBar').should('not.contain.text', 'Exportar');
    cy.get('@topBar').should('not.contain.text', 'Importar');

    cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');
    cy.contains('Crear canvas en este workspace').should('be.visible');
    cy.contains('Canvas dbt').should('be.visible');
    cy.contains('Canvas de transformacion').should('be.visible');
    cy.contains('Flow-based transformation canvas').should('not.exist');
    cy.get('[data-slot="canvas-toolbar-plan-command"]').should('not.exist');
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-menu-navigation-link"]').then(($links) => {
      expect([...$links].map((link) => link.getAttribute('href'))).to.deep.equal([
        '/canvas',
        '/runs',
        '/plugins',
        '/admin',
      ]);
    });
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Plugins').should('be.visible');
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Admin').should('be.visible');
    cy.contains('Contexto del workspace').should('be.visible');
    cy.contains('Contexto Git').should('be.visible');
  });
});
