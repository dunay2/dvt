/** Owned concern: prove Code workbench reads workspace files through scoped browser query rails. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import {
  getLastE2eApiCall,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
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
  {
    path: 'README.md',
    name: 'README.md',
    kind: 'file',
  },
] as const;

function stubMissingCanvasDraft(): void {
  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: E2E_WORKSPACE_SESSION.tenantId,
      projectId: E2E_WORKSPACE_SESSION.projectId,
      environmentId: E2E_WORKSPACE_SESSION.environmentId,
    });

    return {
      statusCode: 404,
      body: {
        error: {
          type: 'not_found',
          reason: 'workspace_graph_draft_not_found',
          message: 'No graph draft exists for this workspace.',
        },
      },
    };
  });
}

function stubCodeWorkbenchApis(
  fileTree: readonly unknown[] = WORKSPACE_FILE_TREE,
  options: { canvasDraft?: 'ready' | 'missing' } = {}
): void {
  stubShellBootstrapApis();
  if (options.canvasDraft === 'missing') {
    stubMissingCanvasDraft();
  } else {
    stubCanvasDraftRead();
  }

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

  stubE2eJsonApi('GET', '/workspace/files', fileTree);
  stubE2eJsonApi('GET', /\/workspace\/files\/.+/, {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: 'select * from orders',
    lastModified: '2026-05-04T00:00:00.000Z',
  });
}

describe('Code workbench workspace files', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
  });

  it('loads the workspace file tree through scoped query rails and opens an editable local Monaco buffer', () => {
    stubCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas/code');

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.contains('button', /^(Code|Codigo)$/).should('be.visible');
    cy.contains('Explorer').should('be.visible');
    cy.contains('stg_orders.sql').should('be.visible');
    cy.contains('Editable local buffer').should('be.visible');
    cy.contains('select * from orders').should('be.visible');

    cy.get('[data-testid="monaco-code-editor"]').within(() => {
      cy.get('.monaco-editor textarea')
        .first()
        .focus()
        .type('{ctrl+a}select 1 as edited_value', { force: true, delay: 0 });
    });
    cy.contains('select 1 as edited_value').should('be.visible');

    cy.location('pathname').should('eq', '/canvas/code');
  });

  it('shows Code beside Graph before a canvas document exists and still accepts local edits', () => {
    stubCodeWorkbenchApis(WORKSPACE_FILE_TREE, { canvasDraft: 'missing' });

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('[data-slot="canvas-workbench-tab-strip"]').within(() => {
      cy.contains('button', /^(Graph|Grafo)$/).should('be.visible');
      cy.contains('button', /^(Code|Codigo)$/)
        .should('be.visible')
        .click();
    });

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.location('pathname').should('eq', '/canvas/code');
    cy.contains('Explorer').should('be.visible');
    cy.get('[data-testid="monaco-code-editor"]').within(() => {
      cy.get('.monaco-editor textarea')
        .first()
        .focus()
        .type('{ctrl+a}select 2 as first_canvas_edit', { force: true, delay: 0 });
    });
    cy.contains('select 2 as first_canvas_edit').should('be.visible');
  });

  it('shows the governed empty state when the query rail returns no files', () => {
    stubCodeWorkbenchApis([]);

    visitWithE2eWorkspaceSession('/canvas/code');

    waitForE2eApiCall('/workspace/files', 'GET');
    cy.contains('No workspace files available').should('be.visible');
    cy.contains('This workspace does not expose files to browse yet.').should('be.visible');
  });

  it('passes tenant, project, and environment scope on workspace file queries', () => {
    stubCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas/code');
    waitForE2eApiCall('/workspace/files', 'GET');

    cy.wrap(null).should(() => {
      const listCall = getLastE2eApiCall('/workspace/files', 'GET');
      expect(listCall?.url.searchParams.get('tenantId')).to.equal(E2E_WORKSPACE_SESSION.tenantId);
      expect(listCall?.url.searchParams.get('projectId')).to.equal(E2E_WORKSPACE_SESSION.projectId);
      expect(listCall?.url.searchParams.get('environmentId')).to.equal(
        E2E_WORKSPACE_SESSION.environmentId
      );
    });
  });
});
