/** Owned concern: prove retired Code routes and contextual Canvas Code working-tree synchronization. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const INITIAL_REVISION = 'a'.repeat(64);
const SYNCHRONIZED_REVISION = 'b'.repeat(64);

function stubCodeWorkbenchBootstrapApis(): void {
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
}

function stubRetiredCodeRouteApis(): void {
  stubCodeWorkbenchBootstrapApis();
  stubE2eJsonApi(
    'GET',
    '/workspace/files',
    { error: { reason: 'retired_canvas_code_route_must_not_query_files' } },
    { statusCode: 500 }
  );
}

function stubContextualCodeWorkbenchApis(): void {
  stubCodeWorkbenchBootstrapApis();
  stubE2eJsonApi('GET', '/workspace/files', [
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
  ]);
  stubE2eJsonApi('GET', /\/workspace\/files\/.+/, {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: 'select * from orders',
    contentSha256: INITIAL_REVISION,
    lastModified: '2026-07-12T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  stubE2eJsonApi('POST', /\/workspace\/files\/.+/, {
    kind: 'saved',
    disposition: 'updated',
    path: 'models/staging/stg_orders.sql',
    contentSha256: SYNCHRONIZED_REVISION,
    lastModified: '2026-07-12T00:00:01.000Z',
  });
}

describe('Retired Canvas Code workbench routes', () => {
  it('redirects direct Code route visits to Graph without querying workspace files', () => {
    stubRetiredCodeRouteApis();

    visitWithE2eWorkspaceSession('/canvas/code');

    cy.location('pathname').should('eq', '/canvas');
    cy.contains('Sales canvas').should('be.visible');
    cy.get('[data-slot="canvas-workbench-tab-strip"]').should('not.exist');
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/files', 'GET')).to.have.length(0);
    });
  });

  it('synchronizes contextual project Code into the working tree without a Save action', () => {
    stubContextualCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.get('[data-slot="canvas-contextual-workbench"]')
      .should('be.visible')
      .within(() => {
        cy.get('[data-slot="code-working-tree-status"]')
          .should('be.visible')
          .and('contain.text', 'Synchronized');
        cy.contains('button', 'Save').should('not.exist');
        cy.get('[data-testid="monaco-code-editor"]')
          .find('.monaco-editor textarea')
          .first()
          .focus()
          .type('{ctrl+a}select 7 as working_tree_verified', { force: true, delay: 0 });
        cy.get('[data-slot="code-working-tree-status"]').should('contain.text', 'Synchronized');
      });

    waitForE2eApiCall(/\/workspace\/files\/.+/, 'POST');
    cy.wrap(null).should(() => {
      expect(getLastE2eApiCall(/\/workspace\/files\/.+/, 'POST')?.body).to.deep.equal({
        content: 'select 7 as working_tree_verified',
        expectedRevision: { kind: 'content_sha256', value: INITIAL_REVISION },
      });
    });
  });
});
