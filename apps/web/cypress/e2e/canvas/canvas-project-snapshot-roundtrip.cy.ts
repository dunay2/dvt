/** Owned concern: prove Canvas project snapshot browser export, import rejection, and reload round trip. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  resetE2eApiStubs,
  getE2eApiCalls,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas project snapshot round trip', () => {
  function stubRuntimeCapabilities(): void {
    resetE2eApiStubs();
    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/workspace/context', {
      effectiveWorkspace: E2E_WORKSPACE_SESSION,
      availableWorkspaces: [E2E_WORKSPACE_SESSION],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: {
        dvt: { available: true },
      },
    });
  }

  function visitReadyCanvas(): void {
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/readyz', 'GET');
    waitForE2eApiCall('/version', 'GET');
    waitForE2eApiCall('/db/ready', 'GET');
    waitForE2eApiCall('/capabilities', 'GET');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
  }

  function addSqlTransformNode(): void {
    cy.get('[aria-label="Show explorer panel"]').click();
    cy.contains('h3', 'Add node')
      .parent()
      .contains('button', 'SQL transform')
      .should('be.enabled')
      .click();
  }

  function waitForDraftSaveCount(expectedCount: number): void {
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(expectedCount);
    });
  }

  it('exports a saved project snapshot and imports it into a clean workspace draft', () => {
    const downloadPath = 'cypress/downloads/sales-canvas-project-snapshot.json';

    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring();
    visitReadyCanvas();

    addSqlTransformNode();
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForDraftSaveCount(1);
    cy.contains('button', /^(Export|Exportar)$/)
      .should('be.enabled')
      .click();

    cy.readFile(downloadPath).then((contents) => {
      const snapshot = (typeof contents === 'string' ? JSON.parse(contents) : contents) as {
        format: string;
        schemaVersion: number;
        canvas: { title: string };
        project: { tenantId: string; projectId: string; environmentId: string };
        draft: { nodeIds: string[]; nodePositions: Record<string, { x: number; y: number }> };
      };
      expect(snapshot.format).to.equal('dvt.project-snapshot');
      expect(snapshot.schemaVersion).to.equal(1);
      expect(snapshot.canvas.title).to.equal('Sales canvas');
      expect(snapshot.project).to.deep.include(E2E_WORKSPACE_SESSION);
      expect(snapshot.draft.nodeIds).to.include('dvt-sql-transform-1');
      expect(snapshot.draft.nodePositions['dvt-sql-transform-1']).to.deep.equal({
        x: 160,
        y: 120,
      });
    });

    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true });
    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('not.exist');
    let saveCountBeforeRejectedImport = 0;
    cy.then(() => {
      saveCountBeforeRejectedImport = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('{not-json'),
        fileName: 'bad-project-snapshot.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
        saveCountBeforeRejectedImport
      );
    });

    cy.get('input[type="file"]').selectFile(downloadPath, {
      force: true,
    });
    waitForDraftSaveCount(saveCountBeforeRejectedImport + 1);

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
  });
});
