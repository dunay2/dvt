/** Owned concern: prove retired Canvas Code workbench routes redirect to Graph without file queries. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubCanvasWorkbenchApis(): void {
  stubShellBootstrapApis();
  stubCanvasDraftRead();

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
  stubE2eApi('GET', '/workspace/files', {
    statusCode: 500,
    body: { error: { reason: 'retired_canvas_code_route_must_not_query_files' } },
  });
}

describe('Retired Canvas Code workbench routes', () => {
  it('redirects direct Code route visits to Graph without querying workspace files', () => {
    stubCanvasWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas/code');

    cy.location('pathname').should('eq', '/canvas');
    cy.contains('Sales canvas').should('be.visible');
    cy.get('[data-slot="canvas-workbench-tab-strip"]').should('not.exist');
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/files', 'GET')).to.have.length(0);
    });
  });
});
