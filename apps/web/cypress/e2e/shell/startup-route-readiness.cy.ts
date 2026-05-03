import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { stubE2eApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Startup route readiness', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellBootstrapApis();
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
    stubCanvasDraftRead();

    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.contains('Preparing initial route').should('be.visible');
    cy.contains(
      /Waiting for runtime capabilities before route readiness\.|Esperando las capacidades de runtime antes de resolver la ruta\./
    ).should('be.visible');
    cy.contains(/5\/5 startup checks settled|5\/5 comprobaciones de arranque resueltas/).should(
      'not.exist'
    );

    cy.then(() => {
      releaseCapabilities();
    });

    cy.contains('Sales canvas').should('be.visible');
    cy.contains(
      /Waiting for runtime capabilities before route readiness\.|Esperando las capacidades de runtime antes de resolver la ruta\./
    ).should('not.exist');
  });
});
