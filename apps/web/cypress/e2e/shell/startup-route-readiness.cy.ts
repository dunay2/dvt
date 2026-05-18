import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eApi, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Startup route readiness', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellBootstrapApis();
  });

  it('settles the startup gate for the public login route', () => {
    cy.visit('/login?returnTo=%2F');

    cy.contains('Login required').should('be.visible');
    cy.get('#app-loading-screen').should('have.attr', 'data-state', 'complete');
    cy.get('#app-loading-screen').should('not.be.visible');
  });

  it('keeps the fifth startup check pending until capabilities settle', () => {
    let releaseCapabilities: () => void = () => undefined;
    stubE2eApi(
      'GET',
      '/capabilities',
      () =>
        new Promise((resolve) => {
          releaseCapabilities = () => {
            resolve({
              body: {
                apiVersion: '1.0.0',
                minFrontendVersion: '0.0.1',
                plugins: {
                  dvt: { available: true },
                },
              },
            });
          };
        })
    );
    stubE2eJsonApi('GET', '/workspace/context', {
      effectiveWorkspace: E2E_WORKSPACE_SESSION,
      availableWorkspaces: [E2E_WORKSPACE_SESSION],
    });
    stubCanvasDraftRead();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('#app-loading-screen').should('be.visible');
    cy.get('#app-loading-screen').should('not.have.attr', 'data-state', 'complete');
    cy.contains('Preparing initial route').should('be.visible');
    cy.contains(/2\/5 startup checks settled|2\/5 comprobaciones de arranque resueltas/).should(
      'be.visible'
    );
    cy.contains(/5\/5 startup checks settled|5\/5 comprobaciones de arranque resueltas/).should(
      'not.exist'
    );

    cy.then(() => {
      releaseCapabilities();
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.contains('Sales canvas').should('be.visible');
    cy.get('#app-loading-screen').should('have.attr', 'data-state', 'complete');
    cy.get('#app-loading-screen').should('not.be.visible');
  });
});
