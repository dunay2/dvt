/** Owned concern: prove Code workbench reads workspace files through scoped browser query rails. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { getLastE2eApiCall, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
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

function stubCodeWorkbenchApis(fileTree: readonly unknown[] = WORKSPACE_FILE_TREE): void {
  stubShellBootstrapApis();
  stubCanvasDraftRead();

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

  it('loads the workspace file tree through scoped query rails and previews the first file', () => {
    stubCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas/code');

    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.contains('button', 'Code').should('be.visible');
    cy.contains('Explorer').should('be.visible');
    cy.contains('stg_orders.sql').should('be.visible');
    cy.contains('Read-only preview').should('be.visible');
    cy.contains('select * from orders').should('be.visible');

    cy.location('pathname').should('eq', '/canvas/code');
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
